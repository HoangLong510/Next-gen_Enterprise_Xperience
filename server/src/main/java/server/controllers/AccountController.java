package server.controllers;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import server.models.Account;
import server.models.enums.Role;
import server.services.AccountService;
import server.utils.ApiResponse;

import java.util.List;

@RestController
@RequestMapping("/accounts")
@RequiredArgsConstructor
public class AccountController {
    private final AccountService accountService;

    @GetMapping("/roles/{role}")
    public ResponseEntity<?> getAccountsByRole(@PathVariable("role") String role) {
        Role roleEnum = Role.valueOf(role);
        System.out.println("debug" + role);
        List<Account> accounts = accountService.getAccountsByRole(roleEnum);
        return ResponseEntity.ok(ApiResponse.success(accounts,"Fetched-accounts-by-role"));
    }
}
