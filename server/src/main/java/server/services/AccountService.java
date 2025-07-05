package server.services;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import server.models.Account;
import server.models.enums.Role;
import server.repositories.AccountRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AccountService {
    private final AccountRepository accountRepository;

    public List<Account> getAccountsByRole(Role role) {
        return accountRepository.findByRole(role);
    }
}
