package server.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;
import server.models.Account;
import server.models.enums.Role;

import java.util.List;
import java.util.Optional;

@Repository
public interface AccountRepository extends JpaRepository<Account, Long>, JpaSpecificationExecutor<Account> {
    Optional<Account> findByUsername(String username);

    // Lấy danh sách account theo nhiều role
    List<Account> findByRoleIn(List<Role> roles);

    // Đếm số account theo role
    long countByRole(Role role);

    // Đếm số account theo trạng thái enabled
    long countByEnabled(boolean enabled);

    // Lấy danh sách account theo 1 role
    List<Account> findByRole(Role role);

    boolean existsByRole(Role role);
    Optional<Account> findFirstByRoleOrderByIdAsc(Role role);
    Optional<Account> findByEmployee_Id(Long employeeId);
    List<Account> findByRoleAndEnabledTrue(Role role);
    Optional<Account> findFirstByRoleAndEnabledTrueOrderByIdAsc(Role role);
    List<Account> findByRoleInAndEnabledTrue(List<Role> roles);
}
