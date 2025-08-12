package server.services;

import io.jsonwebtoken.security.Password;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import server.dtos.AccountDto;
import server.dtos.GetAccountsPageDto;
import server.models.Account;
import server.models.Token;
import server.models.enums.Role;
import server.repositories.AccountRepository;
import server.repositories.TokenRepository;
import server.specification.AccountSpecifications;
import server.utils.AccountGenerator;
import server.utils.ApiResponse;

import java.util.*;

@Service
@RequiredArgsConstructor
public class AccountService {
    private final AccountRepository accountRepository;
    private final AccountGenerator accountGenerator;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final TokenRepository tokenRepository;

    public ApiResponse<?> getAccountsPage(GetAccountsPageDto req) {
        int pageSize = 5;
        int pageNumber = Math.max(1, req.getPageNumber()) - 1;

        Sort.Direction direction = "desc".equalsIgnoreCase(req.getSortBy()) ? Sort.Direction.DESC : Sort.Direction.ASC;
        Pageable pageable = PageRequest.of(pageNumber, pageSize, direction, "createdAt");

        // Parse role
        Role roleFilter = null;
        if (req.getRoleFilter() != null && !req.getRoleFilter().trim().isEmpty()) {
            try {
                roleFilter = Role.valueOf(req.getRoleFilter().trim());
            } catch (IllegalArgumentException e) {
                // không parse được thì giữ nó bằng null và không làm gì cả
            }
        }

        Boolean enabledFilter = null;
        if (req.getStatusFilter() != null && !req.getStatusFilter().trim().isEmpty()) {
            if ("true".equalsIgnoreCase(req.getStatusFilter().trim())) {
                enabledFilter = true;
            } else if ("false".equalsIgnoreCase(req.getStatusFilter().trim())) {
                enabledFilter = false;
            }
        }

        Specification<Account> spec = AccountSpecifications.searchTerm(req.getSearchTerm())
                .and(AccountSpecifications.role(roleFilter))
                .and(AccountSpecifications.enabled(enabledFilter));

        Page<Account> page = accountRepository.findAll(spec, pageable);

        List<AccountDto> listDto = page.getContent().stream()
                .map(account -> {
                    AccountDto dto = new AccountDto();
                    dto.setId(account.getId());
                    dto.setFirstName(account.getEmployee().getFirstName());
                    dto.setLastName(account.getEmployee().getLastName());
                    dto.setUsername(account.getUsername());
                    dto.setEmail(account.getEmployee().getEmail());
                    dto.setPhone(account.getEmployee().getPhone());
                    dto.setCreatedAt(account.getCreatedAt());
                    dto.setUpdatedAt(account.getUpdatedAt());
                    dto.setRole(account.getRole());
                    dto.setEnabled(account.isEnabled());
                    dto.setAvatar(account.getEmployee().getAvatar());
                    //Heartbeat
                    dto.setLastActiveAt(account.getLastActiveAt());
                    dto.setStatus(account.getStatus());

                    return dto;
                })
                .toList();

        long totalDisabled = accountRepository.countByEnabled(false);
        long totalEnabled = accountRepository.countByEnabled(true);
        long totalAccounts = accountRepository.count();

        Map<String, Object> responseData = new HashMap<>();
        responseData.put("totalPage", page.getTotalPages());
        responseData.put("totalAccounts", totalAccounts);
        responseData.put("accounts", listDto);
        responseData.put("totalDisabled", totalDisabled);
        responseData.put("totalEnabled", totalEnabled);
        responseData.put("totalResults", page.getTotalElements());

        return ApiResponse.success(responseData, "get-accounts-page-success");
    }

    public List<Account> getAccountsByRole(Role role) {
        return accountRepository.findByRole(role);
    }

    public ApiResponse<?> getAccountManagementDetails(Long id) {
        Account account = accountRepository.findById(id).orElse(null);
        if (account == null) {
            return ApiResponse.notfound("account-not-found");
        }

        Map<String, Object> responseData = new HashMap<>();

        Map<String, Object> responseAccount = new HashMap<>();
        responseAccount.put("id", account.getId());
        responseAccount.put("username", account.getUsername());
        responseAccount.put("role", account.getRole());
        responseAccount.put("enabled", account.isEnabled());

        List<Map<String, Object>> responseSessions = new ArrayList<>();

        for (var token : account.getTokens()) {
            Map<String, Object> session = new HashMap<>();
            session.put("id", token.getId());
            session.put("deviceName", token.getDeviceName());
            session.put("createdAt", token.getCreatedAt());
            session.put("updatedAt", token.getUpdatedAt());
            responseSessions.add(session);
        }

        responseData.put("account", responseAccount);
        responseData.put("sessions", responseSessions);

        return ApiResponse.success(responseData, "get-account-success");
    }

    public ApiResponse<?> updateRole(Long id, Role role) {
        Account account = accountRepository.findById(id).orElse(null);
        if (account == null) {
            return ApiResponse.notfound("account-not-found");
        }

        if(account.getRole() == Role.HOD && account.getEmployee().getHodDepartment() != null) {
            return ApiResponse.badRequest("the-department-head-is-in-the-department");
        }

        try {
            account.setRole(role);
        } catch (Exception e) {
            return ApiResponse.badRequest("role-invalid");
        }

        accountRepository.save(account);

        return ApiResponse.success(null, "update-role-success");
    }

    public ApiResponse<?> resetPassword(Long id) {
        Account account = accountRepository.findById(id).orElse(null);
        if (account == null) {
            return ApiResponse.notfound("account-not-found");
        }

        String generatedPassword = accountGenerator.generatePassword();
        account.setPassword(passwordEncoder.encode(generatedPassword));
        accountRepository.save(account);

        emailService.sendAccountResetPasswordEmail(account.getEmployee().getEmail(), account.getUsername(), generatedPassword);

        return ApiResponse.success(null, "reset-password-success");
    }

    @Transactional
    public ApiResponse<?> changeStatus(Long id) {
        Account account = accountRepository.findById(id).orElse(null);
        if (account == null) {
            return ApiResponse.notfound("account-not-found");
        }

        if (account.isEnabled()) {
            tokenRepository.removeAllByAccount(account);
            account.setEnabled(false);
            emailService.sendAccountDisabledEmail(account.getEmployee().getEmail(), account.getEmployee().getFirstName(), account.getEmployee().getLastName(), account.getUsername());
        } else {
            account.setEnabled(true);
            emailService.sendAccountEnabledEmail(account.getEmployee().getEmail(), account.getEmployee().getFirstName(), account.getEmployee().getLastName(), account.getUsername());
        }

        accountRepository.save(account);

        return ApiResponse.success(null, "change-status-success");
    }

    public ApiResponse<?> logoutSession(Long id, Long sessionId) {
        Account account = accountRepository.findById(id).orElse(null);
        if (account == null) {
            return ApiResponse.notfound("account-not-found");
        }

        Token token = tokenRepository.findById(sessionId).orElse(null);
        if (token == null) {
            return ApiResponse.notfound("token-not-found");
        }

        tokenRepository.delete(token);
        return ApiResponse.success(null, "logout-session-success");
    }
}
