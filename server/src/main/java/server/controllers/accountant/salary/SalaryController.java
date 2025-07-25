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

    @PostMapping("/create")
    public ApiResponse<?> createSalary(@RequestParam("input") String input,
                                       @RequestParam("baseSalary") BigDecimal baseSalary,
                                       Authentication authentication) {
        return salaryService.createSalary(input, baseSalary, authentication);
    }

    @GetMapping("/history/{employeeId}")
    public ApiResponse<?> getSalaryHistoryByEmployee(@PathVariable Long employeeId) {
        return salaryService.getSalaryHistoryByEmployeeId(employeeId);
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
            @RequestParam(value = "name", required = false) String name
    ) {
        return salaryService.getSalarySummaryList(department, position, name);
    }

    @GetMapping("/template/download")
    public ResponseEntity<byte[]> downloadSalaryTemplate() {
        try {
            ByteArrayInputStream templateStream = salaryService.generateSalaryTemplate();
            byte[] fileBytes = templateStream.readAllBytes();

            return ResponseEntity.ok()
                    .header("Content-Disposition", "attachment; filename=salary-template.xlsx")
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(fileBytes);
        } catch (IOException e) {
            return ResponseEntity.internalServerError()
                    .body(("Failed to generate template: " + e.getMessage()).getBytes());
        }
    }

    @PostMapping("/import")
    public ResponseEntity<ApiResponse<?>> importExcel(@RequestParam("file") MultipartFile file) {
        ApiResponse<?> result = salaryService.importSalaryFromExcel(file);
        return ResponseEntity.ok(result);
    }

}
