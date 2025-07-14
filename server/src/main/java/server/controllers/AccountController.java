package server.controllers;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import server.dtos.leave_requests.AccountResponse;
import server.models.enums.Role;
import server.services.AccountDetailService;
import server.utils.ApiResponse;

import java.util.List;

@RestController
@RequestMapping("/accounts")
@RequiredArgsConstructor
public class AccountController {
    private final AccountDetailService accountDetailService;

    // API lấy danh sách tài khoản theo nhiều role
    @GetMapping("/by-roles")
    public ApiResponse<?> getAccountsByRoles(@RequestParam("roles") List<Role> roles) {
        List<AccountResponse> data = accountDetailService.getAccountsByRoles(roles);
        return ApiResponse.success(data, "Danh sách tài khoản theo roles");
    }
}
