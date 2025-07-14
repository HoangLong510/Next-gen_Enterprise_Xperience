package server.controllers;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import server.dtos.GetAccountsPageDto;
import server.dtos.leave_requests.AccountResponse;
import server.models.Account;
import server.models.enums.Role;
import server.services.AccountService;
import server.services.AccountDetailService;
import server.utils.ApiResponse;

import java.util.List;

@RestController
@RequestMapping("/accounts")
@RequiredArgsConstructor
public class AccountController {
    private final AccountService accountService;
    private final AccountDetailService accountDetailService;

    // API lấy danh sách tài khoản theo nhiều role (ví dụ: roles=HOD&roles=MANAGER)
    @GetMapping("/by-roles")
    public ApiResponse<?> getAccountsByRoles(@RequestParam("roles") List<Role> roles) {
        List<AccountResponse> data = accountDetailService.getAccountsByRoles(roles);
        return ApiResponse.success(data, "Danh sách tài khoản theo roles");
    }

    // API phân trang lấy accounts, chỉ ADMIN được dùng
    @PreAuthorize("hasAnyAuthority('ADMIN')")
    @PostMapping("/get-accounts-page")
    public ResponseEntity<?> getAccountsPage(@RequestBody GetAccountsPageDto req) {
        try {
            ApiResponse<?> response = accountService.getAccountsPage(req);
            return ResponseEntity.status(response.getStatus()).body(response);
        } catch (Exception e) {
            ApiResponse<?> response = ApiResponse.errorServer(e.getMessage());
            return ResponseEntity.status(response.getStatus()).body(response);
        }
    }

    // API lấy accounts theo 1 role (ví dụ: /accounts/roles/PM)
    @GetMapping("/roles/{role}")
    public ResponseEntity<?> getAccountsByRole(@PathVariable("role") String role) {
        Role roleEnum = Role.valueOf(role);
        List<Account> accounts = accountService.getAccountsByRole(roleEnum);
        return ResponseEntity.ok(ApiResponse.success(accounts, "Fetched-accounts-by-role"));
    }
}
