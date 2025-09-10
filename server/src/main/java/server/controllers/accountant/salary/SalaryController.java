package server.controllers.accountant.salary;

import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import server.services.accountant.salary.SalaryService;
import server.utils.ApiResponse;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.math.BigDecimal;

@RestController
@RequestMapping("/accountant/salaries")
@RequiredArgsConstructor
public class SalaryController {

    private final SalaryService salaryService;

    @GetMapping("/employee")
    public ResponseEntity<?> getEmployeeBasicInfo(@RequestParam String input) {
        return ResponseEntity.ok(salaryService.findEmpByEmailOrPhone(input));
    }

    @GetMapping("/departments")
    public ApiResponse<?> getAllDepartments() {
        return salaryService.getAllDepartmentNames();
    }

    @GetMapping("/roles")
    public ApiResponse<?> getAllRoles() {
        return salaryService.getAllRoles();
    }

    @PostMapping("/create")
    public ApiResponse<?> createSalary(@RequestParam("input") String input,
                                       @RequestParam("baseSalary") BigDecimal baseSalary,
                                       Authentication authentication) {
        return salaryService.createSalary(input, baseSalary, authentication);
    }

    @GetMapping
    public ApiResponse<?> getAllSalariesWithFilters(
            @RequestParam(value = "department", required = false) String department,
            @RequestParam(value = "position", required = false) String position,
            @RequestParam(value = "name", required = false) String name
    ) {
        return salaryService.getAllSalariesWithOptionalFilter(department, position, name);
    }

    @GetMapping("/summary")
    public ApiResponse<?> getSalarySummary(
            @RequestParam(value = "department", required = false) String department,
            @RequestParam(value = "position", required = false) String position,
            @RequestParam(value = "name", required = false) String name,
            @RequestParam(value = "role", required = false) String role
    ) {
        return salaryService.getSalarySummaryList(department, position, name, role);
    }


    @GetMapping("/{id}")
    public ResponseEntity<?> getSalaryById(@PathVariable Long id) {
        return ResponseEntity.ok(salaryService.getSalaryById(id));
    }

    @GetMapping("/history/{code}")
    public ResponseEntity<?> getSalaryHistoryByCode(@PathVariable String code) {
        ApiResponse<?> response = salaryService.getSalaryHistoryByEmployeeCode(code);
        return ResponseEntity.status(response.getStatus()).body(response);
    }

    @PostMapping("/generate")
    public ResponseEntity<ApiResponse<?>> generateMonthlySalary(
            @RequestParam int year,
            @RequestParam int month
    ) {
        ApiResponse<?> response = salaryService.generateMonthlySalary(year, month);
        return ResponseEntity.status(response.getStatus()).body(response);
    }
}
