package server.services.accountant.salary;

import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import server.dtos.accountant.salary.*;
import server.models.Account;
import server.models.Employee;
import server.models.accountant.salary.Salary;
import server.models.enums.Gender;
import server.models.enums.Role;
import server.models.enums.SalaryStatus;
import server.repositories.AttendanceRepository;
import server.repositories.EmployeeRepository;
import server.repositories.accountant.salary.SalaryRepository;
import server.services.UploadFileService;
import server.utils.ApiResponse;

import org.apache.poi.ss.usermodel.BorderStyle;

import java.io.*;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import java.time.LocalDateTime;
import java.time.Period;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

import org.apache.poi.xssf.usermodel.XSSFWorkbook;

@Service
@RequiredArgsConstructor
public class SalaryService {

    @Value("${app.upload.folder}")
    private String uploadFolder;

    private final SalaryRepository salaryRepository;
    private final EmployeeRepository employeeRepository;
    private final AttendanceRepository attendanceRepository;

    public ApiResponse<?> findEmpByEmailOrPhone(String input) {
        Optional<Employee> employeeOpt;
        String normalizedInput = input.trim();

        if (normalizedInput.contains("@")) {
            employeeOpt = employeeRepository.findByEmail(normalizedInput);
        } else {
            employeeOpt = employeeRepository.findByPhone(normalizedInput);
        }

        return employeeOpt.map(employee -> {
            String departmentName = (employee.getDepartment() != null)
                    ? employee.getDepartment().getName()
                    : null;

            String position = (employee.getAccount() != null)
                    ? employee.getAccount().getRole().name()
                    : null;

            EmployeeBasicInfoDTO dto = EmployeeBasicInfoDTO.builder()
                    .name(employee.getLastName() + " " + employee.getFirstName())
                    .age(Period.between(employee.getDateBirth(), LocalDate.now()).getYears())
                    .birthday(employee.getDateBirth().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")))
                    .department(departmentName)
                    .phone(employee.getPhone())
                    .email(employee.getEmail())
                    .avatar(employee.getAvatar())
                    .position(position)
                    .build();

            return ApiResponse.success(dto, "get-employee-successfully");
        }).orElseGet(() -> ApiResponse.notfound("employee-not-found"));
    }

    public ApiResponse<?> getAllDepartmentNames() {
        List<String> departmentNames = salaryRepository.findAllDepartmentNames();
        return ApiResponse.success(departmentNames, "get-departments-successfully");
    }

    public ApiResponse<?> getAllRoles() {
        List<String> roles = Arrays.stream(Role.values())
                .map(Enum::name)
                .toList();
        return ApiResponse.success(roles, "get-roles-successfully");
    }

    public ApiResponse<?> createSalary(String input, BigDecimal baseSalary, Authentication authentication) {
        Optional<Employee> optionalEmployee;

        if (input.contains("@")) {
            optionalEmployee = employeeRepository.findByEmail(input.trim());
        } else {
            optionalEmployee = employeeRepository.findByPhone(input.trim());
        }

        if (optionalEmployee.isEmpty()) {
            return ApiResponse.notfound("employee-not-found");
        }

        Employee employee = optionalEmployee.get();
        Account account = (Account) authentication.getPrincipal();

        int month = LocalDate.now().getMonthValue();
        int year = LocalDate.now().getYear();
        
        Optional<Salary> existingSalary = salaryRepository.findSalaryByEmployeeAndMonth(employee.getId(), month, year);
        if (existingSalary.isPresent()) {
            return ApiResponse.badRequest("salary-already-exists-for-this-month");
        }

        Salary salary = new Salary();
        salary.setEmployee(employee);
        salary.setBaseSalary(baseSalary.longValue());
        salary.setStatus(SalaryStatus.PENDING);
        salary.setCreatedAt(LocalDateTime.now());
        salary.setCreatedBy(buildDisplayName(account));
        salary.setCreatedByAvatar(buildAvatarUrl(account));

        salaryRepository.save(salary);
        return ApiResponse.created(null, "salary-record-created-successfully");
    }

    public ApiResponse<?> getSalaryHistoryByEmployeeCode(String code) {
        Optional<Employee> employeeOpt = employeeRepository.findByCode(code);
        if (employeeOpt.isEmpty()) {
            return ApiResponse.notfound("employee-not-found");
        }

        Long employeeId = employeeOpt.get().getId();
        List<Salary> salaryList = salaryRepository.findAllByEmployeeId(employeeId);

        List<SalaryHistoryDTO> history = salaryList.stream()
                .filter(s -> s.getMonth() != null && s.getYear() != null)
                .map(s -> SalaryHistoryDTO.builder()
                        .id(s.getId())
                        .month(s.getMonth())
                        .year(s.getYear())
                        .baseSalary(s.getBaseSalary())
                        .actualSalary(s.getActualSalary())
                        .total(s.getTotal())
                        .status(s.getStatus())
                        .fileUrl(s.getFileUrl())
                        .paymentMethod(s.getPaymentMethod())
                        .createdAt(s.getCreatedAt())
                        .createdBy(s.getCreatedBy())
                        .build())
                .sorted(Comparator.comparing(SalaryHistoryDTO::getCreatedAt).reversed())
                .toList();

        return ApiResponse.success(history, "get-salary-history-successfully");
    }

    public ApiResponse<?> getSalaryById(Long id) {
        Salary s = salaryRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("salary-not-found"));

        Employee emp = s.getEmployee();
        String fullName = emp.getLastName() + " " + emp.getFirstName();
        int age = emp.getDateBirth() != null ? LocalDate.now().getYear() - emp.getDateBirth().getYear() : 0;
        String birthday = emp.getDateBirth() != null ? emp.getDateBirth().toString() : null;

        EmployeeBasicInfoDTO empDto = EmployeeBasicInfoDTO.builder()
                .code(emp.getCode())
                .name(fullName)
                .age(age)
                .birthday(birthday)
                .department(emp.getDepartment() != null ? emp.getDepartment().getName() : null)
                .phone(emp.getPhone())
                .email(emp.getEmail())
                .avatar(emp.getAvatar())
                .position(emp.getAccount() != null ? emp.getAccount().getRole().name() : null)
                .build();

        SalaryDetailDTO dto = SalaryDetailDTO.builder()
                .id(s.getId())
                .employee(empDto)
                .baseSalary(s.getBaseSalary())
                .workingDays(s.getWorkingDays())
                .actualSalary(s.getActualSalary())
                .allowanceLunch(s.getAllowanceLunch())
                .allowancePhone(s.getAllowancePhone())
                .allowanceResponsibility(s.getAllowanceResponsibility())
                .totalSalary(s.getTotalSalary())
                .deductionBhxh(s.getDeductionBhxh())
                .deductionBhyt(s.getDeductionBhyt())
                .deductionBhtn(s.getDeductionBhtn())
                .total(s.getTotal())
                .month(s.getMonth())
                .year(s.getYear())
                .createdAt(s.getCreatedAt())
                .createdBy(s.getCreatedBy())
                .createdByAvatar(s.getCreatedByAvatar())
                .updatedAt(s.getUpdatedAt())
                .status(s.getStatus())
                .paymentMethod(s.getPaymentMethod())
                .fileUrl(s.getFileUrl())
                .build();

        return ApiResponse.success(dto, "get-salary-detail-successfully");
    }

    public ApiResponse<?> getAllSalariesWithOptionalFilter(String department, String position, String name) {
        List<Salary> salaries = salaryRepository.findAll();

        List<SalaryBasicInfoDTO> result = salaries.stream()
                .filter(s -> department == null || department.isBlank() ||
                        (s.getEmployee().getDepartment() != null &&
                                department.equalsIgnoreCase(s.getEmployee().getDepartment().getName())))
                .filter(s -> position == null || position.isBlank() ||
                        (s.getEmployee().getAccount() != null &&
                                position.equalsIgnoreCase(s.getEmployee().getAccount().getRole().name())))
                .filter(s -> name == null || name.isBlank() ||
                        (s.getEmployee().getLastName() + " " + s.getEmployee().getFirstName()).toLowerCase().contains(name.toLowerCase()))
                .map(s -> SalaryBasicInfoDTO.builder()
                        .employeeName(s.getEmployee().getLastName() + " " + s.getEmployee().getFirstName())
                        .role(s.getEmployee().getAccount() != null ? s.getEmployee().getAccount().getRole().name() : null)
                        .department(s.getEmployee().getDepartment() != null ? s.getEmployee().getDepartment().getName() : null)
                        .baseSalary(s.getBaseSalary())
                        .workingDays(s.getWorkingDays())
                        .actualSalary(s.getActualSalary())
                        .allowanceLunch(s.getAllowanceLunch())
                        .allowancePhone(s.getAllowancePhone())
                        .allowanceResponsibility(s.getAllowanceResponsibility())
                        .totalSalary(s.getTotalSalary())
                        .deductionBhxh(s.getDeductionBhxh())
                        .deductionBhyt(s.getDeductionBhyt())
                        .deductionBhtn(s.getDeductionBhtn())
                        .total(s.getTotal())
                        .month(s.getMonth())
                        .year(s.getYear())
                        .build())
                .collect(Collectors.toList());

        return ApiResponse.success(result, "get-salaries-successfully");
    }

    public ApiResponse<?> getSalarySummaryList(String department, String position, String name, String role) {
        List<Salary> salaries = salaryRepository.findAll();

        // Lọc và gom nhóm theo employeeId + month + year để đảm bảo 1 phiếu/tháng/nhân viên
        Map<String, Salary> uniqueSalaryMap = salaries.stream()
                .filter(s -> department == null || department.isBlank() ||
                        (
                                s.getEmployee() != null &&
                                        (
                                                (s.getEmployee().getDepartment() != null && department.equalsIgnoreCase(s.getEmployee().getDepartment().getName())) ||
                                                        (s.getEmployee().getHodDepartment() != null && department.equalsIgnoreCase(s.getEmployee().getHodDepartment().getName()))
                                        )
                        )
                )
                .filter(s -> position == null || position.isBlank() ||
                        (s.getEmployee().getAccount() != null &&
                                position.equalsIgnoreCase(s.getEmployee().getAccount().getRole().name())))
                .filter(s -> role == null || role.isBlank() ||
                        (s.getEmployee().getAccount() != null &&
                                role.equalsIgnoreCase(s.getEmployee().getAccount().getRole().name())))
                .filter(s -> name == null || name.isBlank() ||
                        (s.getEmployee().getLastName() + " " + s.getEmployee().getFirstName())
                                .toLowerCase().contains(name.toLowerCase()))
                .collect(Collectors.toMap(
                        s -> s.getEmployee().getId() + "-" + s.getMonth() + "-" + s.getYear(),
                        s -> s,
                        (s1, s2) -> s1.getCreatedAt().isAfter(s2.getCreatedAt()) ? s1 : s2
                ));

        List<SalarySummaryDTO> result = uniqueSalaryMap.values().stream()
                .filter(s -> s.getMonth() != null && s.getYear() != null)
                .map(s -> SalarySummaryDTO.builder()
                        .id(s.getId())
                        .code(s.getEmployee().getCode())
                        .role(s.getEmployee().getAccount() != null
                                ? s.getEmployee().getAccount().getRole().name()
                                : null)
                        .department(
                                s.getEmployee().getAccount().getRole() == Role.HOD
                                        ? (s.getEmployee().getHodDepartment() != null
                                        ? s.getEmployee().getHodDepartment().getName()
                                        : null)
                                        : (s.getEmployee().getDepartment() != null
                                        ? s.getEmployee().getDepartment().getName()
                                        : null)
                        )
                        .createdBy(s.getCreatedBy())
                        .createdByAvatar(s.getCreatedByAvatar())
                        .createdAt(s.getCreatedAt())
                        .fileUrl(s.getFileUrl())
                        .baseSalary(Optional.ofNullable(s.getBaseSalary()).map(Long::doubleValue).orElse(0.0))
                        .actualSalary(Optional.ofNullable(s.getActualSalary()).map(Long::doubleValue).orElse(0.0))
                        .total(Optional.ofNullable(s.getTotal()).map(Long::doubleValue).orElse(0.0))
                        .status(s.getStatus())
                        .month(s.getMonth())
                        .year(s.getYear())
                        .build())
                .sorted(Comparator.comparing(SalarySummaryDTO::getCreatedAt).reversed())
                .collect(Collectors.toList());

        return ApiResponse.success(result, "get-salary-summary-successfully");
    }

    @Transactional
    public ApiResponse<?> generateMonthlySalary(int year, int month) {
        List<Employee> employees = employeeRepository.findAll();
        int standardWorkingDays = calculateStandardWorkingDays(year, month);
        int createdCount = 0;
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Account account = (auth != null && auth.getPrincipal() instanceof Account acc) ? acc : null;

        for (Employee emp : employees) {
            if (emp.getAccount() == null) continue;

            boolean exists = salaryRepository.existsByEmployeeIdAndMonthAndYear(emp.getId(), month, year);
            if (exists) continue;

            Salary latest = salaryRepository.findTopByEmployeeIdOrderByCreatedAtDesc(emp.getId());
            if (latest == null || latest.getBaseSalary() == null || latest.getBaseSalary() == 0) continue;

            Long baseSalary = latest.getBaseSalary();
            int actualWorkingDays = attendanceRepository.countWorkingDays(
                    emp.getAccount().getId(), year, month);
            long actualSalary = baseSalary * actualWorkingDays / standardWorkingDays;

            // Set phụ cấp và khấu trừ mặc định
            long allowanceLunch = 0;
            long allowancePhone = 0;
            long allowanceResponsibility = 0;
            long deductionBhxh = 0;
            long deductionBhyt = 0;
            long deductionBhtn = 0;

            // Tổng lương chưa khấu trừ
            long totalSalary = actualSalary + allowanceLunch + allowancePhone + allowanceResponsibility;

            // Tổng thực nhận
            long total = totalSalary - deductionBhxh - deductionBhyt - deductionBhtn;

            Salary salary = new Salary();
            salary.setEmployee(emp);
            salary.setBaseSalary(baseSalary);
            salary.setWorkingDays(actualWorkingDays);
            salary.setActualSalary(actualSalary);
            salary.setAllowanceLunch(allowanceLunch);
            salary.setAllowancePhone(allowancePhone);
            salary.setAllowanceResponsibility(allowanceResponsibility);
            salary.setDeductionBhxh(deductionBhxh);
            salary.setDeductionBhyt(deductionBhyt);
            salary.setDeductionBhtn(deductionBhtn);
            salary.setTotalSalary(totalSalary);
            salary.setTotal(total);
            salary.setMonth(month);
            salary.setYear(year);
            salary.setStatus(SalaryStatus.DRAFT);
            salary.setCreatedBy(getCurrentUsername());
            salary.setCreatedByAvatar(buildAvatarUrl(account));

            salaryRepository.save(salary);
            createdCount++;
        }

        if (createdCount == 0) {
            return ApiResponse.badRequest("Không thể tạo phiếu lương mới vì đã tồn tại hoặc thiếu thông tin lương cơ bản.");
        }

        return ApiResponse.success(
                createdCount,
                "Tạo thành công " + createdCount + " phiếu lương cho tháng " + month + "/" + year
        );

    }

    public int calculateStandardWorkingDays(int year, int month) {
        LocalDate start = LocalDate.of(year, month, 1);
        LocalDate end = start.withDayOfMonth(start.lengthOfMonth());

        int workingDays = 0;
        for (LocalDate date = start; !date.isAfter(end); date = date.plusDays(1)) {
            DayOfWeek day = date.getDayOfWeek();
            if (day != DayOfWeek.SUNDAY) {
                workingDays++;
            }
        }
        return workingDays;
    }

    private String getCurrentUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof Account account) {
            return buildDisplayName(account);
        }
        return "unknown";
    }

    private String buildDisplayName(Account account) {
        if (account == null) return null;
        if (account.getEmployee() != null) {
            Employee emp = account.getEmployee();
            String fullName = (emp.getLastName() + " " + emp.getFirstName()).trim();
            if (emp.getEmail() != null && !emp.getEmail().isBlank()) {
                return !fullName.isBlank()
                        ? fullName + " (" + emp.getEmail() + ")"
                        : emp.getEmail();
            }
            return !fullName.isBlank() ? fullName : account.getUsername();
        }
        return account.getUsername();
    }

    private String buildAvatarUrl(Account account) {
        if (account != null && account.getEmployee() != null) {
            return account.getEmployee().getAvatar();
        }
        return null;
    }

}
