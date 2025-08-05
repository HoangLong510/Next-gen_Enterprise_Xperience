package server.services;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import server.dtos.leave_requests.AccountResponse;
import server.models.Account;
import server.models.enums.Role;
import server.repositories.AccountRepository;

import java.util.List;
import java.util.stream.Collectors;


@Service
@RequiredArgsConstructor
public class AccountDetailService implements UserDetailsService {
    private final AccountRepository accountRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        return accountRepository.findByUsername(username).orElseThrow(() -> new UsernameNotFoundException("Account not found"));
    }

    //phần thêm của quân
    public List<AccountResponse> getAccountsByRoles(List<Role> roles) {
        List<Account> accounts = accountRepository.findByRoleIn(roles);
        return accounts.stream().map(this::toAccountResponse).collect(Collectors.toList());
    }
    private AccountResponse toAccountResponse(Account account) {
        AccountResponse dto = new AccountResponse();
        dto.setId(account.getId());
        dto.setUsername(account.getUsername());
        dto.setRole(account.getRole().name());
        if (account.getEmployee() != null) {
            dto.setFullName(account.getEmployee().getFirstName() + " " + account.getEmployee().getLastName());
            dto.setEmail(account.getEmployee().getEmail());
            dto.setPhone(account.getEmployee().getPhone());
        }
        return dto;
    }
    //hết phần thêm của quân
}
