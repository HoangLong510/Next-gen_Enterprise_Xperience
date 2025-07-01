package server.initializers;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import server.models.Account;
import server.models.Employee;
import server.models.enums.Gender;
import server.models.enums.Role;
import server.repositories.AccountRepository;
import server.repositories.EmployeeRepository;

@Component
@RequiredArgsConstructor
public class DataInitializer {
    private final AccountRepository accountRepository;
    private final EmployeeRepository employeeRepository;
    private final PasswordEncoder passwordEncoder;

    @EventListener(ApplicationReadyEvent.class)
    public void initAdminAccount() {
        // Kiểm tra nếu tài khoản admin chưa tồn tại thì tạo
        if (accountRepository.findByUsername("admin").isEmpty()) {
            Account admin = new Account();
            admin.setUsername("admin");
            admin.setPassword(passwordEncoder.encode("123456"));
            admin.setRole(Role.ADMIN);
            admin.setEnabled(true);

            Employee employee = new Employee();
            employee.setFirstName("Administrator");
            employee.setLastName("1");
            employee.setEmail("N/A");
            employee.setPhone("N/A");
            employee.setAddress("N/A");
            employee.setGender(Gender.OTHER);
            employee.setAccount(admin);
            employeeRepository.save(employee);
        }
    }
}
