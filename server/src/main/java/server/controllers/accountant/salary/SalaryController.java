package server.controllers.accountant.salary;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import server.dtos.accountant.salary.SalaryUpdateRequest;
import server.services.accountant.salary.SalaryService;
import server.utils.ApiResponse;

@RestController
@RequestMapping("/accountant/salaries")
@RequiredArgsConstructor
public class SalaryController {

    private final SalaryService salaryService;

    // 🔹 Lấy thông tin cơ bản nhân viên (tìm theo email/phone)
    @GetMapping("/employee")
    public ResponseEntity<?> getEmployeeBasicInfo(@RequestParam String input) {
        return ResponseEntity.ok(salaryService.findEmpByEmailOrPhone(input));
    }

    // 🔹 Danh sách phòng ban
    @GetMapping("/departments")
    public ApiResponse<?> getAllDepartments() {
        return salaryService.getAllDepartmentNames();
    }

    // 🔹 Danh sách roles
    @GetMapping("/roles")
    public ApiResponse<?> getAllRoles() {
        return salaryService.getAllRoles();
    }

    // 🔹 Lấy toàn bộ danh sách phiếu lương (lọc tuỳ chọn)
    @GetMapping
    public ApiResponse<?> getAllSalariesWithFilters(
            @RequestParam(value = "department", required = false) String department,
            @RequestParam(value = "position", required = false) String position,
            @RequestParam(value = "name", required = false) String name
    ) {
        return salaryService.getAllSalariesWithOptionalFilter(department, position, name);
    }

    // 🔹 Lấy danh sách tổng hợp phiếu lương
    @GetMapping("/summary")
    public ApiResponse<?> getSalarySummary(
            @RequestParam(value = "department", required = false) String department,
            @RequestParam(value = "position", required = false) String position,
            @RequestParam(value = "code", required = false) String code,
            @RequestParam(value = "role", required = false) String role
    ) {
        return salaryService.getSalarySummaryList(department, position, code, role);
    }

    // 🔹 Lấy chi tiết phiếu lương theo ID
    @GetMapping("/{id}")
    public ResponseEntity<?> getSalaryById(@PathVariable Long id) {
        return ResponseEntity.ok(salaryService.getSalaryById(id));
    }

    // 🔹 Lịch sử lương theo mã nhân viên
    @GetMapping("/history/{code}")
    public ResponseEntity<?> getSalaryHistoryByCode(@PathVariable String code) {
        ApiResponse<?> response = salaryService.getSalaryHistoryByEmployeeCode(code);
        return ResponseEntity.status(response.getStatus()).body(response);
    }

    // 🔹 Sinh phiếu lương tự động cho tất cả nhân viên (theo tháng/năm)
    @PostMapping("/generate")
    public ResponseEntity<ApiResponse<?>> generateMonthlySalary(
            @RequestParam int year,
            @RequestParam int month
    ) {
        ApiResponse<?> response = salaryService.generateMonthlySalary(year, month);
        return ResponseEntity.status(response.getStatus()).body(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<?>> updateSalary(
            @PathVariable Long id,
            @RequestBody SalaryUpdateRequest dto
    ) {
        ApiResponse<?> response = salaryService.updateSalary(id, dto);
        return ResponseEntity.status(response.getStatus()).body(response);
    }

    @PostMapping("/submit-all")
    public ResponseEntity<ApiResponse<?>> submitAllSalaries(
            @RequestParam int year,
            @RequestParam int month
    ) {
        ApiResponse<?> response = salaryService.submitAllSalaries(year, month);
        return ResponseEntity.status(response.getStatus()).body(response);
    }

    // 🔹 Review all PENDING → REVIEWED (kế toán trưởng)
    @PostMapping("/review-all")
    public ResponseEntity<ApiResponse<?>> reviewAllSalaries(
            @RequestParam int year,
            @RequestParam int month
    ) {
        ApiResponse<?> response = salaryService.reviewAllSalaries(year, month);
        return ResponseEntity.status(response.getStatus()).body(response);
    }

    // 🔹 Approve all REVIEWED → APPROVED (giám đốc)
    @PostMapping("/approve-all-final")
    public ResponseEntity<ApiResponse<?>> approveAllFinalSalaries(
            @RequestParam int year,
            @RequestParam int month
    ) {
        ApiResponse<?> response = salaryService.approveAllFinalSalaries(year, month);
        return ResponseEntity.status(response.getStatus()).body(response);
    }

    // 🔹 Send all APPROVED → PAID (gửi mail slip)
    @PostMapping("/send-all")
    public ResponseEntity<ApiResponse<?>> sendAllSalaryEmails(
            @RequestParam int year,
            @RequestParam int month
    ) {
        ApiResponse<?> response = salaryService.sendAllSalarySlips(year, month);
        return ResponseEntity.status(response.getStatus()).body(response);
    }


}
