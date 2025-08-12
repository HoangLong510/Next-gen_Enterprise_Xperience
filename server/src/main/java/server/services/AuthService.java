package server.services;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.validation.BindingResult;
import server.dtos.ChangePasswordDto;
import server.dtos.LoginDto;
import server.dtos.ProfileDto;
import server.dtos.TokenDto;
import server.models.Account;
import server.models.Token;
import server.repositories.AccountRepository;
import server.repositories.TokenRepository;
import server.utils.ApiResponse;
import server.utils.JwtUtil;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final AccountRepository accountRepository;
    private final TokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final RecaptchaService recaptchaService;

    // Phần thêm của Quân
    public Account getCurrentAccount(HttpServletRequest request) {
        String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new RuntimeException("Bạn chưa đăng nhập!");
        }
        String accessToken = authHeader.substring(7);
        String username = jwtUtil.extractUsername(accessToken);
        return accountRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản: " + username));
    }
    // Hết phần thêm

    public ApiResponse<?> login(LoginDto request, BindingResult result) {

        if(request.getCaptchaToken() != null) {
            boolean captchaValid = recaptchaService.verify(request.getCaptchaToken());
            if (!captchaValid) {
                return ApiResponse.badRequest("captcha-verification-failed");
            }
        }


        if (result.hasErrors()) {
            return ApiResponse.badRequest(result);
        }
        Optional<Account> account = accountRepository.findByUsername(request.getUsername());
        if (account.isEmpty()) {
            result.rejectValue("username", "", "username-does-not-exist");
            return ApiResponse.badRequest(result);
        }
        if (!passwordEncoder.matches(request.getPassword(), account.get().getPassword())) {
            result.rejectValue("password", "", "password-does-not-match");
            return ApiResponse.badRequest(result);
        }

        if(!account.get().isEnabled()){
            result.rejectValue("username", "", "account-is-disabled");
            return ApiResponse.badRequest(result, "account-is-disabled");
        }

        String accessToken = jwtUtil.generateAccessToken(account.get());
        String refreshToken = jwtUtil.generateRefreshToken(account.get());
        Token token = new Token();
        token.setAccessToken(accessToken);
        token.setRefreshToken(refreshToken);
        token.setAccount(account.get());
        token.setDeviceName(request.getDeviceName());
        tokenRepository.save(token);

        TokenDto tokenDto = new TokenDto();
        tokenDto.setAccessToken(token.getAccessToken());
        tokenDto.setRefreshToken(token.getRefreshToken());

        return ApiResponse.success(tokenDto,"login-successfully");
    }

    public ApiResponse<?> refreshToken(HttpServletRequest request) {
        String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ApiResponse.unauthorized();
        }

        String refreshToken = authHeader.substring(7);
        String username = jwtUtil.extractUsername(refreshToken);

        Optional<Account> account = accountRepository.findByUsername(username);
        if (account.isEmpty()) {
            return ApiResponse.unauthorized();
        }
        if (!jwtUtil.isValidRefreshToken(refreshToken, account.get())) {
            return ApiResponse.unauthorized();
        }

        Token token = tokenRepository.findByRefreshToken(refreshToken).orElse(null);
        if (token == null) {
            return ApiResponse.unauthorized();
        }
        token.setAccessToken(jwtUtil.generateAccessToken(account.get()));
        token.setRefreshToken(jwtUtil.generateRefreshToken(account.get()));
        tokenRepository.save(token);

        TokenDto tokenDto = new TokenDto();
        tokenDto.setAccessToken(token.getAccessToken());
        tokenDto.setRefreshToken(token.getRefreshToken());

        return ApiResponse.success(tokenDto, "refresh-token-successfully");
    }

    public ApiResponse<?> fetchData(HttpServletRequest request) {
        String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ApiResponse.unauthorized();
        }

        String accessToken = authHeader.substring(7);
        String username = jwtUtil.extractUsername(accessToken);

        Optional<Account> accountOptional = accountRepository.findByUsername(username);
        if (accountOptional.isEmpty()) {
            return ApiResponse.unauthorized();
        }

        if (!jwtUtil.isValidAccessToken(accessToken, accountOptional.get())) {
            return ApiResponse.unauthorized();
        }

        Account account = accountOptional.get();

        ProfileDto profileDto = new ProfileDto();
        profileDto.setId(account.getId());
        profileDto.setUsername(username);
        profileDto.setFirstName(account.getEmployee().getFirstName());
        profileDto.setLastName(account.getEmployee().getLastName());
        profileDto.setEmail(account.getEmployee().getEmail());
        profileDto.setPhone(account.getEmployee().getPhone());
        profileDto.setAddress(account.getEmployee().getAddress());
        profileDto.setGender(account.getEmployee().getGender().toString());
        profileDto.setDateBirth(account.getEmployee().getDateBirth());
        profileDto.setRole(account.getRole().toString());
        profileDto.setCreatedAt(account.getCreatedAt());
        profileDto.setAvatar(account.getEmployee().getAvatar());

        if(account.getEmployee().getDepartment() != null) {
            profileDto.setDepartment(account.getEmployee().getDepartment().getName());
        }

        if(account.getEmployee().getHodDepartment() != null) {
            profileDto.setDepartment(account.getEmployee().getHodDepartment().getName());
        }

        return ApiResponse.success(profileDto, "");
    }

    @Transactional
    public ApiResponse<?> changePassword(ChangePasswordDto request, BindingResult result) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication.getName();
        Account account = accountRepository.findByUsername(username).orElse(null);

        if (account == null) {
            return ApiResponse.unauthorized();
        }

        if (result.hasErrors()) {
            return ApiResponse.badRequest(result);
        }

        if(!request.getNewPassword().equals(request.getConfirmNewPassword())) {
            result.rejectValue("newConfirmPassword", "", "confirm-password-does-not-match");
            return ApiResponse.badRequest(result);
        }

        if(!passwordEncoder.matches(request.getPassword(), account.getPassword())) {
            result.rejectValue("password", "", "password-does-not-match");
            return ApiResponse.badRequest(result);
        }

        if(passwordEncoder.matches(request.getNewPassword(), account.getPassword())) {
            result.rejectValue("newPassword", "", "do-not-set-the-same-password-as-the-old-one");
            return ApiResponse.badRequest(result);
        }

        account.setPassword(passwordEncoder.encode(request.getNewPassword()));
        accountRepository.save(account);

        tokenRepository.removeAllByAccount(account);

        return ApiResponse.success(account, "change-password-successfully");
    }
}
