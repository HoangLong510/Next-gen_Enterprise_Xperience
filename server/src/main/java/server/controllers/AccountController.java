package server.controllers;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import server.dtos.GetAccountsPageDto;
import server.services.AccountService;
import server.utils.ApiResponse;
import server.models.Account;
import server.models.enums.Role;

import java.util.List;

@RestController
@RequestMapping("/accounts")
@RequiredArgsConstructor
public class AccountController {
    private final AccountService accountService;

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

    @GetMapping("/roles/{role}")
    public ResponseEntity<?> getAccountsByRole(@PathVariable("role") String role) {
        Role roleEnum = Role.valueOf(role);
        System.out.println("debug" + role);
        List<Account> accounts = accountService.getAccountsByRole(roleEnum);
        return ResponseEntity.ok(ApiResponse.success(accounts,"Fetched-accounts-by-role"));
    }
}
