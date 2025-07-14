package server.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import server.models.Account;
import server.models.enums.Role;

import java.util.List;
import java.util.Optional;

@Repository
public interface AccountRepository extends JpaRepository<Account, Long> {
    Optional<Account> findByUsername(String username);
    //phần thêm của quân
    List<Account> findByRoleIn(List<Role> roles);
    //hết phần thêm của quân
}
