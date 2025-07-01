package server.services;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.validation.BindingResult;
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

    public ApiResponse<?> login(LoginDto request, BindingResult result) {
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

        String accessToken = jwtUtil.generateAccessToken(account.get());
        String refreshToken = jwtUtil.generateRefreshToken(account.get());
        Token token = new Token();
        token.setAccessToken(accessToken);
        token.setRefreshToken(refreshToken);
        token.setAccount(account.get());
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
        profileDto.setUsername(username);
        profileDto.setFirstName(account.getEmployee().getFirstName());
        profileDto.setLastName(account.getEmployee().getLastName());
        profileDto.setEmail(account.getEmployee().getEmail());
        profileDto.setPhone(account.getEmployee().getPhone());
        profileDto.setAddress(account.getEmployee().getAddress());
        profileDto.setGender(account.getEmployee().getGender().toString());
        profileDto.setRole(account.getRole().toString());

        return ApiResponse.success(profileDto, "");
    }
}
