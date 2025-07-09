package server.services;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import server.dtos.AccountDto;
import server.dtos.GetAccountsPageDto;
import server.models.Account;
import server.models.enums.Role;
import server.repositories.AccountRepository;
import server.specification.AccountSpecifications;
import server.utils.ApiResponse;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AccountService {
    private final AccountRepository accountRepository;

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
            if ("true".equalsIgnoreCase(req.getStatusFilter().trim())){
                enabledFilter = true;
            } else if ("false".equalsIgnoreCase(req.getStatusFilter().trim())){
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
                    dto.setCreatedAt(account.getCreatedAt());
                    dto.setUpdatedAt(account.getUpdatedAt());
                    dto.setRole(account.getRole());
                    dto.setEnabled(account.isEnabled());
                    dto.setAvatar(account.getEmployee().getAvatar());
                    return dto;
                })
                .toList();

        long totalAdmin = accountRepository.countByRole(Role.ADMIN);
        long totalEnabled = accountRepository.countByEnabled(true);
        long totalAccounts = accountRepository.count();

        Map<String, Object> responseData = new HashMap<>();
        responseData.put("totalPage", page.getTotalPages());
        responseData.put("totalAccounts", totalAccounts);
        responseData.put("accounts", listDto);
        responseData.put("totalAdmin", totalAdmin);
        responseData.put("totalEnabled", totalEnabled);

        return ApiResponse.success(responseData, "get-accounts-page-success");
    }
}
