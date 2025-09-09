package server.controllers;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import server.dtos.AccountDto;
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
    @PreAuthorize("hasAnyAuthority('ADMIN', 'HR', 'MANAGER')")
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

    @PreAuthorize("hasAnyAuthority('ADMIN')")
    @GetMapping("/get-account-management-details/{id}")
    public ResponseEntity<?> getAccountManagementDetails(@PathVariable("id") Long id) {
        try {
            ApiResponse<?> response = accountService.getAccountManagementDetails(id);
            return ResponseEntity.status(response.getStatus()).body(response);
        } catch (Exception e) {
            ApiResponse<?> response = ApiResponse.errorServer(e.getMessage());
            return ResponseEntity.status(response.getStatus()).body(response);
        }
    }

    @PreAuthorize("hasAnyAuthority('ADMIN', 'HR', 'MANAGER')")
    @GetMapping("/update-role/{id}/{role}")
    public ResponseEntity<?> updateRole(@PathVariable("id") Long id, @PathVariable("role") Role role) {
        try {
            ApiResponse<?> response = accountService.updateRole(id, role);
            return ResponseEntity.status(response.getStatus()).body(response);
        } catch (Exception e) {
            ApiResponse<?> response = ApiResponse.errorServer(e.getMessage());
            return ResponseEntity.status(response.getStatus()).body(response);
        }
    }

    @PreAuthorize("hasAnyAuthority('ADMIN', 'HR', 'MANAGER')")
    @GetMapping("/reset-password/{id}")
    public ResponseEntity<?> resetPassword(@PathVariable("id") Long id) {
        try {
            ApiResponse<?> response = accountService.resetPassword(id);
            return ResponseEntity.status(response.getStatus()).body(response);
        } catch (Exception e) {
            ApiResponse<?> response = ApiResponse.errorServer(e.getMessage());
            return ResponseEntity.status(response.getStatus()).body(response);
        }
    }

    @PreAuthorize("hasAnyAuthority('ADMIN', 'HR', 'MANAGER')")
    @GetMapping("/change-status/{id}")
    public ResponseEntity<?> changeStatus(@PathVariable("id") Long id) {
        try {
            ApiResponse<?> response = accountService.changeStatus(id);
            return ResponseEntity.status(response.getStatus()).body(response);
        } catch (Exception e) {
            ApiResponse<?> response = ApiResponse.errorServer(e.getMessage());
            return ResponseEntity.status(response.getStatus()).body(response);
        }
    }

    @PreAuthorize("hasAnyAuthority('ADMIN')")
    @GetMapping("/logout-session/{id}/{sessionId}")
    public ResponseEntity<?> changeStatus(@PathVariable("id") Long id, @PathVariable("sessionId") Long sessionId) {
        try {
            ApiResponse<?> response = accountService.logoutSession(id, sessionId);
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
        List<AccountDto> accounts = accountService.getAccountsByRole(roleEnum);
        return ResponseEntity.ok(ApiResponse.success(accounts, "Fetched-accounts-by-role"));
    }

}
