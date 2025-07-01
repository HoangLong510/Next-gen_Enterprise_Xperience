package server.services;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.validation.BindingResult;
import server.dtos.CreateEmployeeDto;
import server.models.Account;
import server.models.Employee;
import server.models.enums.Gender;
import server.models.enums.Role;
import server.repositories.AccountRepository;
import server.repositories.EmployeeRepository;
import server.utils.ApiResponse;

@Service
@RequiredArgsConstructor
public class EmployeeService {
    private final EmployeeRepository employeeRepository;
    private final PasswordEncoder passwordEncoder;
    private final AccountRepository accountRepository;

    public ApiResponse<?> create(CreateEmployeeDto request, BindingResult result) {
        if(!request.getPassword().equals(request.getConfirmPassword())) {
            result.rejectValue("confirmPassword", "", "confirm-password-does-not-match");
        }

        boolean existsUsername = accountRepository.findByUsername(request.getUsername()).isPresent();
        if (existsUsername) {
            result.rejectValue("username", "", "username-already-exists");
        }

        boolean existsEmail = employeeRepository.findByEmail(request.getEmail()).isPresent();
        if (existsEmail) {
            result.rejectValue("email", "", "email-already-exists");
        }

        boolean existsPhone = employeeRepository.findByPhone(request.getPhone()).isPresent();
        if (existsPhone) {
            result.rejectValue("phone", "", "phone-already-exists");
        }

        if (result.hasErrors()) {
            return ApiResponse.badRequest(result);
        }

        Account account = new Account();
        account.setUsername(request.getUsername());
        account.setPassword(passwordEncoder.encode(request.getPassword()));
        account.setRole(Role.valueOf(request.getRole()));

        Employee employee = new Employee();
        employee.setFirstName(request.getFirstName());
        employee.setLastName(request.getLastName());
        employee.setEmail(request.getEmail());
        employee.setPhone(request.getPhone());
        employee.setAddress(request.getAddress());
        employee.setGender(Gender.valueOf(request.getGender()));
        employee.setAccount(account);
        employeeRepository.save(employee);

        return ApiResponse.created(null, "employee-created-successfully");
    }
}
