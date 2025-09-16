package server.services.accountant.salary;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import server.dtos.accountant.salary.*;
import server.models.Account;
import server.models.Employee;
import server.models.accountant.salary.Salary;
import server.models.enums.Role;
import server.models.enums.SalaryStatus;
import server.repositories.AttendanceRepository;
import server.repositories.ContractRepository;
import server.repositories.EmployeeRepository;
import server.repositories.accountant.salary.SalaryRepository;
import server.services.EmailService;
import server.services.UploadFileService;
import server.utils.ApiResponse;
import server.utils.PdfGenerator;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SalaryService {

    private final EmailService emailService;
    private final UploadFileService uploadFileService;
    @Value("${app.upload.folder}")
    private String uploadFolder;

    private final SalaryRepository salaryRepository;
    private final EmployeeRepository employeeRepository;
    private final AttendanceRepository attendanceRepository;
    private final ContractRepository contractRepository;

    /* ================== Generate Monthly Salary ================== */
    @Transactional
    public ApiResponse<?> generateMonthlySalary(int year, int month) {
        List<Employee> employees = employeeRepository.findAll();
        int standardWorkingDays = calculateStandardWorkingDays(year, month);
        int createdCount = 0;
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Account account = (auth != null && auth.getPrincipal() instanceof Account acc) ? acc : null;

        for (Employee emp : employees) {
            if (emp.getAccount() == null) continue;

            // Skip if salary for this month already exists
            if (salaryRepository.existsByEmployeeIdAndMonthAndYear(emp.getId(), month, year)) continue;

            // Get active contract
            var contractOpt = contractRepository.findActiveByEmployeeId(emp.getId());
            if (contractOpt.isEmpty() || contractOpt.get().getBasicSalary() == null) {
                continue; // Skip if no contract or no base salary
            }
            long baseSalary = contractOpt.get().getBasicSalary().longValue();

            // Copy allowances from previous month
            Salary prev = salaryRepository.findTopByEmployeeIdOrderByCreatedAtDesc(emp.getId());
            long allowanceLunch = 500_000L;
            long allowancePhone = 300_000L;
            long allowanceResponsibility = 1_000_000L;

            // Count valid working days
            int actualWorkingDays = attendanceRepository.countValidWorkingDays(
                    emp.getAccount().getId(), year, month
            );

            long actualSalary = baseSalary * actualWorkingDays / standardWorkingDays;

            // Default deductions (can be extended later)
            long deductionBhxh = Math.round(baseSalary * 0.08);
            long deductionBhyt = Math.round(baseSalary * 0.015);
            long deductionBhtn = Math.round(baseSalary * 0.01);

            long totalSalary = actualSalary + allowanceLunch + allowancePhone + allowanceResponsibility;
            long taxableIncome = totalSalary - deductionBhxh - deductionBhyt - deductionBhtn;
            long personalIncomeTax = calculatePersonalIncomeTax(taxableIncome);
            long total = taxableIncome - personalIncomeTax;

            // Create salary slip automatically
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
            salary.setPersonalIncomeTax(personalIncomeTax);
            salary.setTotal(total);
            salary.setMonth(month);
            salary.setYear(year);
            salary.setStatus(SalaryStatus.DRAFT);
            salary.setCreatedAt(LocalDateTime.now());
            salary.setCreatedBy(getCurrentUsername());
            salary.setCreatedByAvatar(buildAvatarUrl(account));

            salaryRepository.save(salary);
            createdCount++;
        }

        if (createdCount == 0) {
            return ApiResponse.badRequest("No new salary records created (already exists or missing contract).");
        }

        return ApiResponse.success(
                createdCount,
                "Successfully created " + createdCount + " salary records for " + month + "/" + year
        );
    }

    /* ================== Query APIs for Controller ================== */

    public ApiResponse<?> findEmpByEmailOrPhone(String input) {
        Optional<Employee> employeeOpt;
        String normalized = input.trim();

        if (normalized.contains("@")) {
            employeeOpt = employeeRepository.findByEmail(normalized);
        } else {
            employeeOpt = employeeRepository.findByPhone(normalized);
        }

        return employeeOpt.map(emp -> {
            String departmentName = emp.getDepartment() != null ? emp.getDepartment().getName() : null;
            String position = emp.getAccount() != null ? emp.getAccount().getRole().name() : null;

            EmployeeBasicInfoDTO dto = EmployeeBasicInfoDTO.builder()

                    .name(emp.getLastName() + " " + emp.getFirstName())
                    .age(Period.between(emp.getDateBirth(), LocalDate.now()).getYears())
                    .birthday(emp.getDateBirth().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")))
                    .department(departmentName)
                    .phone(emp.getPhone())
                    .email(emp.getEmail())
                    .avatar(emp.getAvatar())
                    .position(position)
                    .build();

            return ApiResponse.success(dto, "Employee found successfully.");
        }).orElseGet(() -> ApiResponse.notfound("Employee not found."));
    }

    public ApiResponse<?> getAllDepartmentNames() {
        List<String> departments = salaryRepository.findAllDepartmentNames();
        return ApiResponse.success(departments, "Departments retrieved successfully.");
    }

    public ApiResponse<?> getAllRoles() {
        List<String> roles = Arrays.stream(Role.values()).map(Enum::name).toList();
        return ApiResponse.success(roles, "Roles retrieved successfully.");
    }

    public ApiResponse<?> getAllSalariesWithOptionalFilter(String department, String position, String name) {
        List<Salary> salaries = salaryRepository.findAll();

        List<SalaryBasicInfoDTO> result = salaries.stream()
                .filter(s -> department == null || department.isBlank()
                        || (s.getEmployee().getDepartment() != null
                        && department.equalsIgnoreCase(s.getEmployee().getDepartment().getName())))
                .filter(s -> position == null || position.isBlank()
                        || (s.getEmployee().getAccount() != null
                        && position.equalsIgnoreCase(s.getEmployee().getAccount().getRole().name())))
                .filter(s -> name == null || name.isBlank()
                        || (s.getEmployee().getLastName() + " " + s.getEmployee().getFirstName())
                        .toLowerCase().contains(name.toLowerCase()))
                .map(s -> SalaryBasicInfoDTO.builder()
                        .code(s.getEmployee().getCode())
                        .employeeName(s.getEmployee().getLastName() + " " + s.getEmployee().getFirstName())
                        .role(s.getEmployee().getAccount() != null ? s.getEmployee().getAccount().getRole().name() : null)
                        .department(s.getEmployee().getDepartment() != null ? s.getEmployee().getDepartment().getName() : null)
                        .baseSalary(s.getBaseSalary())
                        .workingDays(s.getWorkingDays())
                        .actualSalary(s.getActualSalary())

                        .allowanceLunch(s.getAllowanceLunch())
                        .allowancePhone(s.getAllowancePhone())
                        .allowanceResponsibility(s.getAllowanceResponsibility())

                        .totalAllowance(
                                (Optional.ofNullable(s.getAllowanceLunch()).orElse(0L)) +
                                        (Optional.ofNullable(s.getAllowancePhone()).orElse(0L)) +
                                        (Optional.ofNullable(s.getAllowanceResponsibility()).orElse(0L))
                        )

                        .totalSalary(s.getTotalSalary())

                        .deductionBhxh(s.getDeductionBhxh())
                        .deductionBhyt(s.getDeductionBhyt())
                        .deductionBhtn(s.getDeductionBhtn())
                        .personalIncomeTax(s.getPersonalIncomeTax())

                        .totalDeduction(
                                (Optional.ofNullable(s.getDeductionBhxh()).orElse(0L)) +
                                        (Optional.ofNullable(s.getDeductionBhyt()).orElse(0L)) +
                                        (Optional.ofNullable(s.getDeductionBhtn()).orElse(0L)) +
                                        (Optional.ofNullable(s.getPersonalIncomeTax()).orElse(0L))
                        )

                        .total(s.getTotal())
                        .month(s.getMonth())
                        .year(s.getYear())
                        .status(s.getStatus() != null ? s.getStatus().name() : null)
                        .createdBy(s.getCreatedBy())
                        .createdAt(s.getCreatedAt() != null ? s.getCreatedAt().toString() : null)
                        .build()
                )
                .toList();

        return ApiResponse.success(result, "Salaries retrieved successfully.");
    }

    public ApiResponse<?> getSalarySummaryList(String department, String position, String code, String role) {
        List<Salary> salaries = salaryRepository.findAll();

        Map<String, Salary> uniqueSalaryMap = salaries.stream()
                .filter(s -> department == null || department.isBlank()
                        || (s.getEmployee().getDepartment() != null
                        && department.equalsIgnoreCase(s.getEmployee().getDepartment().getName())))
                .filter(s -> position == null || position.isBlank()
                        || (s.getEmployee().getAccount() != null
                        && position.equalsIgnoreCase(s.getEmployee().getAccount().getRole().name())))
                .filter(s -> role == null || role.isBlank()
                        || (s.getEmployee().getAccount() != null
                        && role.equalsIgnoreCase(s.getEmployee().getAccount().getRole().name())))
                .filter(s -> code == null || code.isBlank()
                        || (s.getEmployee().getCode() != null
                        && s.getEmployee().getCode().toLowerCase().contains(code.toLowerCase())))
                .collect(Collectors.toMap(
                        s -> s.getEmployee().getId() + "-" + s.getMonth() + "-" + s.getYear(),
                        s -> s,
                        (s1, s2) -> s1.getCreatedAt().isAfter(s2.getCreatedAt()) ? s1 : s2
                ));

        List<SalarySummaryDTO> result = uniqueSalaryMap.values().stream()
                .map(s -> SalarySummaryDTO.builder()
                        .id(s.getId())
                        .code(s.getEmployee().getCode())
                        .role(s.getEmployee().getAccount() != null ? s.getEmployee().getAccount().getRole().name() : null)
                        .department(s.getEmployee().getDepartment() != null ? s.getEmployee().getDepartment().getName() : null)
                        .createdBy(s.getCreatedBy())
                        .createdAt(s.getCreatedAt())
                        .fileUrl(s.getFileUrl())
                        .baseSalary(Optional.ofNullable(s.getBaseSalary()).map(Long::doubleValue).orElse(0.0))
                        .actualSalary(Optional.ofNullable(s.getActualSalary()).map(Long::doubleValue).orElse(0.0))

                        .totalAllowance(
                                Optional.ofNullable(s.getAllowanceLunch()).orElse(0L).doubleValue() +
                                        Optional.ofNullable(s.getAllowancePhone()).orElse(0L).doubleValue() +
                                        Optional.ofNullable(s.getAllowanceResponsibility()).orElse(0L).doubleValue()
                        )
                        .totalDeduction(
                                Optional.ofNullable(s.getDeductionBhxh()).orElse(0L).doubleValue() +
                                        Optional.ofNullable(s.getDeductionBhyt()).orElse(0L).doubleValue() +
                                        Optional.ofNullable(s.getDeductionBhtn()).orElse(0L).doubleValue() +
                                        Optional.ofNullable(s.getPersonalIncomeTax()).orElse(0L).doubleValue()
                        )

                        .total(Optional.ofNullable(s.getTotal()).map(Long::doubleValue).orElse(0.0))
                        .status(s.getStatus())
                        .month(s.getMonth())
                        .year(s.getYear())
                        .build())
                .toList();

        return ApiResponse.success(result, "Salary summary retrieved successfully.");
    }

    public ApiResponse<?> getSalaryById(Long id) {
        Salary s = salaryRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Salary not found."));

        Employee emp = s.getEmployee();
        EmployeeBasicInfoDTO empDto = EmployeeBasicInfoDTO.builder()
                .code(emp.getCode())
                .name(emp.getLastName() + " " + emp.getFirstName())
                .age(Period.between(emp.getDateBirth(), LocalDate.now()).getYears())
                .birthday(emp.getDateBirth().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")))
                .department(emp.getDepartment() != null ? emp.getDepartment().getName() : null)
                .phone(emp.getPhone())
                .email(emp.getEmail())
                .avatar(emp.getAvatar())
                .position(emp.getAccount() != null ? emp.getAccount().getRole().name() : null)
                .build();

        int standardWorkingDays = calculateStandardWorkingDays(s.getYear(), s.getMonth());

        SalaryDetailDTO dto = SalaryDetailDTO.builder()
                .id(s.getId())
                .employee(empDto)

                // Lương cơ bản & công
                .baseSalary(s.getBaseSalary())
                .workingDays(s.getWorkingDays())
                .actualSalary(s.getActualSalary())

                // Phụ cấp
                .allowanceLunch(s.getAllowanceLunch())
                .allowancePhone(s.getAllowancePhone())
                .allowanceResponsibility(s.getAllowanceResponsibility())
                .otherAllowance(s.getOtherAllowance())

                .totalSalary(s.getTotalSalary())

                // Khấu trừ
                .deductionBhxh(s.getDeductionBhxh())
                .deductionBhyt(s.getDeductionBhyt())
                .deductionBhtn(s.getDeductionBhtn())
                .personalIncomeTax(s.getPersonalIncomeTax())
                .otherDeduction(s.getOtherDeduction())

                // Tổng hợp
                .total(s.getTotal())
                .month(s.getMonth())
                .year(s.getYear())
                .status(s.getStatus())
                .fileUrl(s.getFileUrl())
                .createdAt(s.getCreatedAt())
                .createdBy(s.getCreatedBy())
                .createdByAvatar(s.getCreatedByAvatar())
                .updatedAt(s.getUpdatedAt())
                .paymentMethod(s.getPaymentMethod())

                // Thêm ngày công chuẩn để FE hiển thị
                .standardWorkingDays(standardWorkingDays)
                .build();

        return ApiResponse.success(dto, "Salary details retrieved successfully.");
    }

    public ApiResponse<?> getSalaryHistoryByEmployeeCode(String code) {
        Optional<Employee> empOpt = employeeRepository.findByCode(code);
        if (empOpt.isEmpty()) {
            return ApiResponse.notfound("Employee not found.");
        }

        List<Salary> salaries = salaryRepository.findAllByEmployeeId(empOpt.get().getId());

        List<SalaryHistoryDTO> history = salaries.stream()
                .map(s -> SalaryHistoryDTO.builder()
                        .id(s.getId())
                        .month(s.getMonth())
                        .year(s.getYear())
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
                        .personalIncomeTax(s.getPersonalIncomeTax())
                        .total(s.getTotal())
                        .status(s.getStatus())
                        .paymentMethod(s.getPaymentMethod())
                        .fileUrl(s.getFileUrl())
                        .createdAt(s.getCreatedAt())
                        .createdBy(s.getCreatedBy())
                        .createdByAvatar(s.getCreatedByAvatar())
                        .updatedAt(s.getUpdatedAt())
                        .employee(EmployeeBasicInfoDTO.builder()
                                .code(s.getEmployee().getCode())
                                .name(s.getEmployee().getLastName() + " " + s.getEmployee().getFirstName())
                                .department(s.getEmployee().getDepartment() != null
                                        ? s.getEmployee().getDepartment().getName() : null)
                                .position(s.getEmployee().getAccount() != null
                                        ? s.getEmployee().getAccount().getRole().name() : null)
                                .email(s.getEmployee().getEmail())
                                .phone(s.getEmployee().getPhone())
                                .build())
                        .build()
                )
                .sorted(Comparator.comparing(SalaryHistoryDTO::getCreatedAt).reversed())
                .toList();

        return ApiResponse.success(history, "Salary history retrieved successfully.");
    }

    @Transactional
    public ApiResponse<?> updateSalary(Long id, SalaryUpdateRequest dto) {
        Salary salary = salaryRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Salary not found."));

        if (salary.getStatus() == SalaryStatus.PAID || salary.getStatus() == SalaryStatus.CANCELED) {
            return ApiResponse.badRequest("Cannot update salary that is already PAID or CANCELED.");
        }

        boolean changed = false;

        if (dto.getBaseSalary() != null && !dto.getBaseSalary().equals(salary.getBaseSalary())) {
            salary.setBaseSalary(dto.getBaseSalary());
            changed = true;
        }
        if (dto.getActualSalary() != null && !dto.getActualSalary().equals(salary.getActualSalary())) {
            salary.setActualSalary(dto.getActualSalary());
            changed = true;
        }
        if (dto.getAllowanceLunch() != null && !dto.getAllowanceLunch().equals(salary.getAllowanceLunch())) {
            salary.setAllowanceLunch(dto.getAllowanceLunch());
            changed = true;
        }
        if (dto.getAllowancePhone() != null && !dto.getAllowancePhone().equals(salary.getAllowancePhone())) {
            salary.setAllowancePhone(dto.getAllowancePhone());
            changed = true;
        }
        if (dto.getAllowanceResponsibility() != null && !dto.getAllowanceResponsibility().equals(salary.getAllowanceResponsibility())) {
            salary.setAllowanceResponsibility(dto.getAllowanceResponsibility());
            changed = true;
        }
        if (dto.getOtherAllowance() != null && !dto.getOtherAllowance().equals(salary.getOtherAllowance())) {
            salary.setOtherAllowance(dto.getOtherAllowance());
            changed = true;
        }

        if (dto.getDeductionBhxh() != null && !dto.getDeductionBhxh().equals(salary.getDeductionBhxh())) {
            salary.setDeductionBhxh(dto.getDeductionBhxh());
            changed = true;
        }
        if (dto.getDeductionBhyt() != null && !dto.getDeductionBhyt().equals(salary.getDeductionBhyt())) {
            salary.setDeductionBhyt(dto.getDeductionBhyt());
            changed = true;
        }
        if (dto.getDeductionBhtn() != null && !dto.getDeductionBhtn().equals(salary.getDeductionBhtn())) {
            salary.setDeductionBhtn(dto.getDeductionBhtn());
            changed = true;
        }
        if (dto.getPersonalIncomeTax() != null && !dto.getPersonalIncomeTax().equals(salary.getPersonalIncomeTax())) {
            salary.setPersonalIncomeTax(dto.getPersonalIncomeTax());
            changed = true;
        }
        if (dto.getOtherDeduction() != null && !dto.getOtherDeduction().equals(salary.getOtherDeduction())) {
            salary.setOtherDeduction(dto.getOtherDeduction());
            changed = true;
        }

        if (dto.getTotalSalary() != null && !dto.getTotalSalary().equals(salary.getTotalSalary())) {
            salary.setTotalSalary(dto.getTotalSalary());
            changed = true;
        }
        if (dto.getTotal() != null && !dto.getTotal().equals(salary.getTotal())) {
            salary.setTotal(dto.getTotal());
            changed = true;
        }

        if (changed && salary.getStatus() == SalaryStatus.APPROVED) {
            salary.setStatus(SalaryStatus.DRAFT);
        }

        salary.setUpdatedAt(LocalDateTime.now());
        salaryRepository.save(salary);

        return ApiResponse.success(salary, "Salary updated successfully.");
    }

    @Transactional
    public ApiResponse<?> submitAllSalaries(int year, int month) {
        List<Salary> list = salaryRepository.findByYearAndMonthAndStatus(year, month, SalaryStatus.DRAFT);
        int count = 0;
        for (Salary s : list) {
            s.setStatus(SalaryStatus.PENDING);
            s.setUpdatedAt(LocalDateTime.now());
            salaryRepository.save(s);
            count++;
        }
        return ApiResponse.success(count, "Submitted " + count + " salaries for approval.");
    }

    @Transactional
    public ApiResponse<?> reviewAllSalaries(int year, int month) {
        List<Salary> list = salaryRepository.findByYearAndMonthAndStatus(year, month, SalaryStatus.PENDING);
        int count = 0;
        for (Salary s : list) {
            s.setStatus(SalaryStatus.REVIEWED);
            s.setUpdatedAt(LocalDateTime.now());
            salaryRepository.save(s);
            count++;
        }
        return ApiResponse.success(count, "Reviewed " + count + " salaries.");
    }

    @Transactional
    public ApiResponse<?> approveAllFinalSalaries(int year, int month) {
        List<Salary> list = salaryRepository.findByYearAndMonthAndStatus(year, month, SalaryStatus.REVIEWED);
        int count = 0;
        for (Salary s : list) {
            s.setStatus(SalaryStatus.APPROVED);
            s.setUpdatedAt(LocalDateTime.now());
            salaryRepository.save(s);
            count++;
        }
        return ApiResponse.success(count, "Approved " + count + " salaries.");
    }

    @Transactional
    public ApiResponse<?> sendAllSalarySlips(int year, int month) {
        List<Salary> list = salaryRepository.findByYearAndMonthAndStatus(year, month, SalaryStatus.APPROVED);
        int sent = 0;
        for (Salary s : list) {
            try {
                byte[] pdf = PdfGenerator.generateSalarySlip(s);
                String fileUrl = savePdfAndReturnUrl(s, pdf);
                s.setFileUrl(fileUrl);

                emailService.sendSalarySlipEmail(
                        s.getEmployee().getEmail(),
                        s.getEmployee().getLastName() + " " + s.getEmployee().getFirstName(),
                        pdf,
                        year,
                        month,
                        s.getEmployee().getCode() + "_slip.pdf"
                );

                s.setStatus(SalaryStatus.PAID);
                s.setUpdatedAt(LocalDateTime.now());
                salaryRepository.save(s);
                sent++;
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
        return ApiResponse.success("","Sent " + sent + " salary slips for " + month + "/" + year);
    }

    private String savePdfAndReturnUrl(Salary salary, byte[] pdf) throws IOException {
        String fileName = "salary_" + salary.getEmployee().getCode()
                + "_" + salary.getMonth() + "_" + salary.getYear() + ".pdf";

        Path dirPath = Paths.get(uploadFolder, "salary",
                String.valueOf(salary.getYear()),
                String.valueOf(salary.getMonth()));

        Files.createDirectories(dirPath);

        Path filePath = dirPath.resolve(fileName);

        Files.write(filePath, pdf);

        return "/uploads/salary/" + salary.getYear() + "/" + salary.getMonth() + "/" + fileName;
    }



    /* ================== Helpers ================== */
    private long calculatePersonalIncomeTax(long taxableIncome) {
        long tax = 0;
        long remaining = taxableIncome;

        long[] levels = {5000000, 5000000, 8000000, 14000000, 20000000, 28000000};
        double[] rates = {0.05, 0.1, 0.15, 0.20, 0.25, 0.30, 0.35};

        for (int i = 0; i < levels.length; i++) {
            long amount = Math.min(remaining, levels[i]);
            if (amount > 0) {
                tax += amount * rates[i];
                remaining -= amount;
            }
        }
        if (remaining > 0) {
            tax += remaining * rates[rates.length - 1];
        }

        return tax;
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
            var emp = account.getEmployee();
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
