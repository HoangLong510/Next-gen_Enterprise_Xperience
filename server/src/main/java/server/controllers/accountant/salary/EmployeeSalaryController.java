package server.controllers.accountant.salary;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import server.dtos.accountant.salary.EmployeeSalaryRequestDTO;
import server.models.Account;
import server.services.accountant.salary.EmployeeSalaryService;
import server.utils.ApiResponse;

@RestController
@RequestMapping("/accountant/salaries")
@RequiredArgsConstructor
public class EmployeeSalaryController {

    private final EmployeeSalaryService salaryService;

    @GetMapping
    public ResponseEntity<?> getAll() {
        ApiResponse<?> response = salaryService.getAllSalaries();
        return ResponseEntity.status(response.getStatus()).body(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        ApiResponse<?> response = salaryService.getSalaryById(id);
        return ResponseEntity.status(response.getStatus()).body(response);
    }

    @PostMapping
    public ResponseEntity<?> create(
            @Valid @RequestBody EmployeeSalaryRequestDTO request,
            BindingResult bindingResult,
            @AuthenticationPrincipal Account account
    ) {
        ApiResponse<?> response = salaryService.createSalary(request, bindingResult, account);
        return ResponseEntity.status(response.getStatus()).body(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(
            @PathVariable Long id,
            @Valid @RequestBody EmployeeSalaryRequestDTO request,
            BindingResult bindingResult
    ) {
        ApiResponse<?> response = salaryService.updateSalary(id, request, bindingResult);
        return ResponseEntity.status(response.getStatus()).body(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        ApiResponse<?> response = salaryService.deleteSalary(id);
        return ResponseEntity.status(response.getStatus()).body(response);
    }

    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<?> getByEmployee(@PathVariable Long employeeId) {
        ApiResponse<?> response = salaryService.getSalariesByEmployee(employeeId);
        return ResponseEntity.status(response.getStatus()).body(response);
    }

    @GetMapping("/employee/{employeeId}/status/{status}")
    public ResponseEntity<?> getByEmployeeAndStatus(@PathVariable Long employeeId, @PathVariable String status) {
        ApiResponse<?> response = salaryService.getSalariesByEmployeeAndStatus(employeeId, status);
        return ResponseEntity.status(response.getStatus()).body(response);
    }
}
