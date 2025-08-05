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

    private final MailService mailService;
    @Value("${app.upload.folder}")
    private String uploadFolder;

    private final SalaryRepository salaryRepository;
    private final EmployeeRepository employeeRepository;
    private final AttendanceRepository attendanceRepository;
    private final UploadFileService uploadFileService;
    private final PasswordEncoder passwordEncoder;

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

    public ApiResponse<?> getSalarySummaryList(String department, String position, String name) {
        List<Salary> salaries = salaryRepository.findAll();

        // Lọc và gom nhóm theo employeeId + month + year để đảm bảo 1 phiếu/tháng/nhân viên
        Map<String, Salary> uniqueSalaryMap = salaries.stream()
                .filter(s -> department == null || department.isBlank() ||
                        (s.getEmployee().getDepartment() != null &&
                                department.equalsIgnoreCase(s.getEmployee().getDepartment().getName())))
                .filter(s -> position == null || position.isBlank() ||
                        (s.getEmployee().getAccount() != null &&
                                position.equalsIgnoreCase(s.getEmployee().getAccount().getRole().name())))
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
                        .department(s.getEmployee().getDepartment() != null
                                ? s.getEmployee().getDepartment().getName()
                                : null)
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

    public ByteArrayInputStream generateSalaryTemplate() throws IOException {
        String[] columns = {
                "Mã nhân viên", "Họ và tên", "Email", "Số điện thoại",
                "Chức vụ", "Giới tính", "Ngày sinh", "Lương cơ bản"
        };

        List<Employee> employees = employeeRepository.findAll().stream()
                .filter(emp -> emp.getCode() != null || emp.getAccount() != null)
                .filter(emp -> {
                    if (emp.getAccount() == null) return true;
                    String username = emp.getAccount().getUsername();
                    String password = emp.getAccount().getPassword();
                    return !(username.equalsIgnoreCase("admin") &&
                            passwordEncoder.matches("123456", password));
                })
                .collect(Collectors.toList());

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Danh sách lương");

            DataFormat format = workbook.createDataFormat();

            // ---------- Styles ----------
            Font titleFont = workbook.createFont();
            titleFont.setFontHeightInPoints((short) 14);
            titleFont.setBold(true);

            CellStyle titleStyle = workbook.createCellStyle();
            titleStyle.setFont(titleFont);
            titleStyle.setAlignment(HorizontalAlignment.CENTER);

            Font headerFont = workbook.createFont();
            headerFont.setBold(true);

            CellStyle headerStyle = workbook.createCellStyle();
            headerStyle.setFont(headerFont);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            headerStyle.setFillForegroundColor(IndexedColors.LIGHT_YELLOW.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setBorderBottom(BorderStyle.THIN);
            headerStyle.setBorderTop(BorderStyle.THIN);
            headerStyle.setBorderLeft(BorderStyle.THIN);
            headerStyle.setBorderRight(BorderStyle.THIN);

            CellStyle dataStyle = workbook.createCellStyle();
            dataStyle.setAlignment(HorizontalAlignment.CENTER);
            dataStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            dataStyle.setBorderBottom(BorderStyle.THIN);
            dataStyle.setBorderTop(BorderStyle.THIN);
            dataStyle.setBorderLeft(BorderStyle.THIN);
            dataStyle.setBorderRight(BorderStyle.THIN);

            CellStyle textStyle = workbook.createCellStyle();
            textStyle.cloneStyleFrom(dataStyle);
            textStyle.setDataFormat(format.getFormat("@"));

            CellStyle dateStyle = workbook.createCellStyle();
            dateStyle.cloneStyleFrom(dataStyle);
            dateStyle.setDataFormat(format.getFormat("dd/MM/yyyy"));

            // ---------- Ghi chú bên phải ----------
            CellStyle ghiChuHeaderStyle = workbook.createCellStyle();
            Font ghiChuHeaderFont = workbook.createFont();
            ghiChuHeaderFont.setBold(true);
            ghiChuHeaderStyle.setFont(ghiChuHeaderFont);
            ghiChuHeaderStyle.setAlignment(HorizontalAlignment.CENTER);
            ghiChuHeaderStyle.setFillForegroundColor(IndexedColors.ROSE.getIndex());
            ghiChuHeaderStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            ghiChuHeaderStyle.setBorderBottom(BorderStyle.THIN);
            ghiChuHeaderStyle.setBorderTop(BorderStyle.THIN);
            ghiChuHeaderStyle.setBorderLeft(BorderStyle.THIN);
            ghiChuHeaderStyle.setBorderRight(BorderStyle.THIN);

            CellStyle noteCellStyle = workbook.createCellStyle();
            noteCellStyle.setWrapText(true);
            noteCellStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            noteCellStyle.setAlignment(HorizontalAlignment.LEFT);
            noteCellStyle.setBorderBottom(BorderStyle.THIN);
            noteCellStyle.setBorderTop(BorderStyle.THIN);
            noteCellStyle.setBorderLeft(BorderStyle.THIN);
            noteCellStyle.setBorderRight(BorderStyle.THIN);

            sheet.setColumnWidth(0, 15 * 256);
            sheet.setColumnWidth(1, 25 * 256);
            sheet.setColumnWidth(2, 35 * 256);
            sheet.setColumnWidth(3, 27 * 256);
            sheet.setColumnWidth(4, 25 * 256);
            sheet.setColumnWidth(6, 20 * 256);
            sheet.setColumnWidth(7, 20 * 256);
            sheet.setColumnWidth(9, 20 * 256);
            sheet.setColumnWidth(10, 40 * 256);

            // ---------- Title ----------
            Row titleRow = sheet.createRow(0);
            titleRow.setHeightInPoints(45); // 3 hàng
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("DANH SÁCH LƯƠNG NHÂN VIÊN");
            titleCell.setCellStyle(titleStyle);
            sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, columns.length - 1));

            // ---------- Header ----------
            Row headerRow = sheet.createRow(1);
            headerRow.setHeightInPoints(30); // 2 hàng
            for (int i = 0; i < columns.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(columns[i]);
                cell.setCellStyle(headerStyle);
            }

            // ---------- Ghi chú ----------
            Cell ghiChuHeader = titleRow.createCell(9);
            ghiChuHeader.setCellValue("Ghi Chú");
            ghiChuHeader.setCellStyle(ghiChuHeaderStyle);
            sheet.addMergedRegion(new CellRangeAddress(0, 0, 9, 10));

            String[][] notes = {
                    {"#", "Mô tả"},
                    {"Ngày Sinh", "Định dạng DD/MM/YYYY"},
                    {"Lương Cơ Bản", "Đơn vị đồng (đ)"},
                    {"Các ô còn lại", "Bắt buộc điền hết"}
            };

            int noteStartRow = 1; // Excel row 2
            for (int i = 0; i < notes.length; i++) {
                Row row = sheet.getRow(noteStartRow + i);
                if (row == null) row = sheet.createRow(noteStartRow + i);
                if (i == 0) row.setHeightInPoints(30); // header ghi chú = 2 hàng
                for (int j = 0; j < 2; j++) {
                    Cell cell = row.createCell(9 + j);
                    cell.setCellValue(notes[i][j]);
                    cell.setCellStyle(i == 0 ? headerStyle : noteCellStyle);
                }
            }

            // ---------- Data ----------
            int rowIdx = 2;
            for (Employee emp : employees) {
                boolean exists = salaryRepository.findAll().stream()
                        .anyMatch(s -> s.getEmployee().getId().equals(emp.getId()));
                if (exists) continue;

                Row row = sheet.getRow(rowIdx);
                if (row == null) row = sheet.createRow(rowIdx);
                rowIdx++;

                String fullName = emp.getLastName() + " " + emp.getFirstName();

                String[] values = {
                        emp.getCode(),
                        fullName,
                        Optional.ofNullable(emp.getEmail()).orElse(""),
                        Optional.ofNullable(emp.getPhone()).orElse(""),
                        (emp.getAccount() != null && emp.getAccount().getRole() != null)
                                ? emp.getAccount().getRole().name()
                                : "",
                        emp.getGender() != null ? emp.getGender().name() : "OTHER",
                        "", // Ngày sinh
                        ""  // Lương cơ bản
                };

                for (int i = 0; i < values.length; i++) {
                    Cell cell = row.createCell(i);
                    if (i == 0 && (emp.getCode() == null || emp.getCode().isBlank())) {
                        cell.setCellValue("");
                        cell.setCellStyle(textStyle);
                    } else if (i == 3) {
                        cell.setCellValue(values[i]);
                        cell.setCellStyle(textStyle);
                    } else if (i == 6 && emp.getDateBirth() != null) {
                        cell.setCellValue(emp.getDateBirth());
                        cell.setCellStyle(dateStyle);
                    } else {
                        cell.setCellValue(values[i]);
                        cell.setCellStyle(dataStyle);
                    }
                }
            }

            workbook.write(out);
            return new ByteArrayInputStream(out.toByteArray());
        }
    }

    public ApiResponse<?> importSalaryFromExcel(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return ApiResponse.badRequest("missing-file");
        }

        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            int successCount = 0;
            int failCount = 0;
            List<String> errors = new ArrayList<>();

            for (int rowIndex = 3; rowIndex <= sheet.getLastRowNum(); rowIndex++) {
                Row row = sheet.getRow(rowIndex);
                if (row == null) continue;

                try {
                    String code = getCellString(row.getCell(0));
                    String fullName = getCellString(row.getCell(1));
                    String email = getCellString(row.getCell(2));
                    String phone = getCellString(row.getCell(3));
                    String role = getCellString(row.getCell(4));
                    String salaryStr = getCellString(row.getCell(5));

                    String displayName = code != null && !code.isBlank() ? code : fullName;

                    if (salaryStr == null || salaryStr.isBlank()) {
                        errors.add("Lương cơ bản của nhân viên " + displayName + " bị trống!");
                        failCount++;
                        continue;
                    }

                    long baseSalary;
                    try {
                        baseSalary = Long.parseLong(salaryStr);
                        if (baseSalary <= 0) throw new NumberFormatException();
                    } catch (NumberFormatException ex) {
                        errors.add("Lương cơ bản của nhân viên " + displayName +
                                " không đúng định dạng. Lương cơ bản phải là số tự nhiên.");
                        failCount++;
                        continue;
                    }

                    Employee employee = null;
                    if (email != null && !email.isBlank()) {
                        employee = employeeRepository.findByEmail(email).orElse(null);
                    }
                    if (employee == null && phone != null && !phone.isBlank()) {
                        employee = employeeRepository.findByPhone(phone).orElse(null);
                    }

                    if (employee == null) {
                        // Tạo mới nhân viên
                        employee = new Employee();

                        // Tách họ tên
                        String[] parts = fullName != null ? fullName.trim().split("\\s+") : new String[0];
                        if (parts.length > 1) {
                            employee.setFirstName(parts[parts.length - 1]);
                            employee.setLastName(String.join(" ", Arrays.copyOf(parts, parts.length - 1)));
                        } else if (parts.length == 1) {
                            employee.setFirstName(parts[0]);
                            employee.setLastName("");
                        } else {
                            errors.add("Không thể tạo nhân viên từ tên rỗng tại dòng " + (rowIndex + 1));
                            failCount++;
                            continue;
                        }

                        employee.setEmail(email);
                        employee.setPhone(phone);
                        employee.setGender(Gender.ORTHER);
                        employee.setDateBirth(LocalDate.of(2000, 1, 1));
                        employee.setAddress("");

                        // Tạo mã nhân viên
                        employee.setCode(employee.generateCode());

                        // Tạo tài khoản
                        if (email == null || email.isBlank()) {
                            errors.add("Không thể tạo tài khoản cho nhân viên không có email tại dòng " + (rowIndex + 1));
                            failCount++;
                            continue;
                        }

                        Account acc = new Account();
                        acc.setUsername(email);
                        acc.setPassword(passwordEncoder.encode("123456"));
                        acc.setEnabled(true);
                        acc.setRole(Role.EMPLOYEE);

                        employee.setAccount(acc);
                        employeeRepository.save(employee);

                        // Gửi email tài khoản
                        String subject = "Thông tin tài khoản đăng nhập hệ thống";
                        String content = String.format("""
                        Xin chào %s,

                        Bạn đã được tạo tài khoản trên hệ thống quản lý công ty.

                        Tên đăng nhập: %s
                        Mật khẩu mặc định: %s

                        Vui lòng đăng nhập và đổi mật khẩu sau lần đầu tiên.

                        Trân trọng,
                        Hệ thống quản lý công ty
                        """, fullName, email, "123456");

                        try {
                            mailService.sendMail(email, subject, content);
                        } catch (Exception ex) {
                            errors.add("Không thể gửi email cho nhân viên " + fullName + ": " + ex.getMessage());
                        }

                    } else {
                        // Nếu đã có thì kiểm tra thông tin khớp
                        String dbFullName = (employee.getLastName() + " " + employee.getFirstName()).trim().toLowerCase();
                        String excelFullName = fullName != null ? fullName.trim().toLowerCase() : "";

                        boolean nameMatch = normalize(dbFullName).equals(normalize(excelFullName));
                        boolean emailMatch = email.equalsIgnoreCase(employee.getEmail());
                        boolean phoneMatch = phone.equals(employee.getPhone());
                        boolean roleMatch = role == null || employee.getAccount() == null
                                || employee.getAccount().getRole() == null
                                || role.equalsIgnoreCase(employee.getAccount().getRole().name());

                        if (!(nameMatch && emailMatch && phoneMatch && roleMatch)) {
                            errors.add("Thông tin của nhân viên " + displayName + " không khớp với hệ thống.");
                            failCount++;
                            continue;
                        }
                    }

                    final Long employeeId = employee.getId();
                    boolean alreadyExists = salaryRepository.findAll().stream()
                            .anyMatch(s -> s.getEmployee().getId().equals(employeeId));
                    if (alreadyExists) continue;

                    Salary salary = new Salary();
                    salary.setEmployee(employee);
                    salary.setBaseSalary(baseSalary);
                    salary.setCreatedAt(LocalDateTime.now());
                    salary.setCreatedBy(getCurrentUsername());
                    salary.setStatus(SalaryStatus.PENDING);

                    salaryRepository.save(salary);
                    successCount++;

                } catch (Exception ex) {
                    errors.add("Lỗi dòng " + (rowIndex + 1) + ": " + ex.getMessage());
                    failCount++;
                }
            }

            Map<String, Object> result = Map.of(
                    "successCount", successCount,
                    "failCount", failCount,
                    "errors", errors
            );
            return ApiResponse.success(result, "import-result");

        } catch (IOException e) {
            return ApiResponse.errorServer("cannot-read-excel-file: " + e.getMessage());
        }
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

    private String getCellString(Cell cell) {
        if (cell == null) return null;

        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue().trim();
            case NUMERIC:
                return String.valueOf((long) cell.getNumericCellValue()).trim();
            case BOOLEAN:
                return String.valueOf(cell.getBooleanCellValue()).trim();
            case FORMULA:
                try {
                    return cell.getStringCellValue().trim();
                } catch (IllegalStateException e) {
                    return String.valueOf(cell.getNumericCellValue()).trim();
                }
            case BLANK:
            default:
                return null;
        }
    }

    private String normalize(String input) {
        if (input == null) return "";
        return java.text.Normalizer.normalize(input, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replaceAll("\\s+", "")
                .toLowerCase();
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

    private String saveFileIfPresent(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            return null;
        }
        String fullPath = uploadFileService.storeFile("salaries", file);
        String fileName = java.nio.file.Paths.get(fullPath).getFileName().toString();
        return "/uploads/salaries/" + fileName;
    }
}
