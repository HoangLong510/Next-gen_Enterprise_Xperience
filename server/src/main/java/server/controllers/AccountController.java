package server.controllers;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import server.dtos.GetAccountsPageDto;
import server.services.AccountService;
import server.utils.ApiResponse;

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
}
