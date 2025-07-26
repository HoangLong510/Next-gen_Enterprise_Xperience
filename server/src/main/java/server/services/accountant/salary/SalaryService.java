package server.services.accountant.salary;

import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.util.IOUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.security.core.Authentication;
import org.springframework.web.multipart.MultipartFile;
import server.dtos.accountant.fund.salary.EmployeeBasicInfoDTO;
import server.dtos.accountant.fund.salary.SalaryBasicInfoDTO;
import server.dtos.accountant.fund.salary.SalarySummaryDTO;
import server.models.Account;
import server.models.Employee;
import server.models.accountant.salary.Salary;
import server.models.enums.SalaryStatus;
import server.repositories.EmployeeRepository;
import server.repositories.accountant.salary.SalaryRepository;
import server.services.UploadFileService;
import server.utils.ApiResponse;
import java.util.stream.Stream;
import org.apache.poi.ss.usermodel.BorderStyle;

import java.io.*;
import java.math.BigDecimal;
import java.time.LocalDate;
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
    private final UploadFileService uploadFileService;

    public ApiResponse<?> findEmpByEmailOrPhone(String input) {
        Optional<Employee> employeeOpt;
        String normalizedInput = input.trim();
        if (normalizedInput.toLowerCase().startsWith("email:")) {
            String email = normalizedInput.substring("email:".length()).trim();
            employeeOpt = employeeRepository.findByEmail(email);
        } else if (normalizedInput.toLowerCase().startsWith("phone:")) {
            String phone = normalizedInput.substring("phone:".length()).trim();
            employeeOpt = employeeRepository.findByPhone(phone);
        } else {
            return ApiResponse.badRequest("invalid-input-format");
        }

        return employeeOpt.map(employee -> {
            EmployeeBasicInfoDTO dto = EmployeeBasicInfoDTO.builder()
                    .name(employee.getLastName() + " " + employee.getFirstName())
                    .age(Period.between(employee.getDateBirth(), LocalDate.now()).getYears())
                    .birthday(employee.getDateBirth().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")))
                    .department(employee.getDepartment().getName())
                    .phone(employee.getPhone())
                    .email(employee.getEmail())
                    .avatar(employee.getAvatar())
                    .build();
            return ApiResponse.success(dto, "get-employee-successfully");
        }).orElseGet(() -> ApiResponse.notfound("employee-not-found"));
    }

    public ApiResponse<?> getAllDepartmentNames() {
        List<String> departmentNames = salaryRepository.findAllDepartmentNames();
        return ApiResponse.success(departmentNames, "get-departments-successfully");
    }

    public ApiResponse<?> createSalary(String input, BigDecimal baseSalary,  Authentication authentication) {
        Optional<Employee> optionalEmployee;
        if (input.startsWith("Email:")) {
            String email = input.substring("Email:".length()).trim();
            optionalEmployee = employeeRepository.findByEmail(email);
        } else if (input.startsWith("Phone:")) {
            String phone = input.substring("Phone:".length()).trim();
            optionalEmployee = employeeRepository.findByPhone(phone);
        } else {
            return ApiResponse.badRequest("invalid-input-format");
        }

        if (optionalEmployee.isEmpty()) {
            return ApiResponse.notfound("employee-not-found");
        }

        Employee employee = optionalEmployee.get();
        Account account = (Account) authentication.getPrincipal();

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

    public ApiResponse<?> getSalaryHistoryByEmployeeId(Long employeeId) {
        List<Salary> salaryList = salaryRepository.findAllByEmployeeId(employeeId);
        return ApiResponse.success(salaryList, "get-salary-history-successfully");
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

        Map<Long, List<Salary>> groupedByEmployee = salaries.stream()
                .filter(s -> department == null || department.isBlank() ||
                        (s.getEmployee().getDepartment() != null &&
                                department.equalsIgnoreCase(s.getEmployee().getDepartment().getName())))
                .filter(s -> position == null || position.isBlank() ||
                        (s.getEmployee().getAccount() != null &&
                                position.equalsIgnoreCase(s.getEmployee().getAccount().getRole().name())))
                .filter(s -> name == null || name.isBlank() ||
                        (s.getEmployee().getLastName() + " " + s.getEmployee().getFirstName())
                                .toLowerCase().contains(name.toLowerCase()))
                .collect(Collectors.groupingBy(s -> s.getEmployee().getId()));

        List<SalarySummaryDTO> result = groupedByEmployee.entrySet().stream()
                .map(entry -> {
                    List<Salary> group = entry.getValue();
                    Salary sample = group.get(0);

                    Double totalAmount = group.stream()
                            .mapToDouble(s -> s.getTotal() != null ? s.getTotal() : 0)
                            .sum();

                    Double totalBaseSalary = group.stream()
                            .mapToDouble(s -> s.getBaseSalary() != null ? s.getBaseSalary() : 0)
                            .sum();

                    return SalarySummaryDTO.builder()
                            .code(sample.getEmployee().getCode())
                            .role(sample.getEmployee().getAccount() != null
                                    ? sample.getEmployee().getAccount().getRole().name()
                                    : null)
                            .department(sample.getEmployee().getDepartment() != null
                                    ? sample.getEmployee().getDepartment().getName()
                                    : null)
                            .createdBy(sample.getCreatedBy())
                            .createdAt(sample.getCreatedAt())
                            .fileUrl(sample.getFileUrl())
                            .total(totalAmount)
                            .baseSalary(totalBaseSalary)
                            .month(sample.getMonth())
                            .year(sample.getYear())
                            .build();
                })
                .sorted(Comparator.comparing(SalarySummaryDTO::getCreatedAt).reversed())
                .collect(Collectors.toList());

        return ApiResponse.success(result, "get-salary-summary-successfully");
    }

    public ByteArrayInputStream generateSalaryTemplate() throws IOException {
        String[] columns = {"Mã nhân viên", "Họ và tên", "Email", "Số điện thoại", "Chức vụ", "Lương cơ bản"};
        List<Employee> employees = employeeRepository.findAll().stream()
                .filter(emp -> emp.getCode() != null)
                .filter(emp -> {
                    if (emp.getAccount() == null) return true;
                    String username = emp.getAccount().getUsername();
                    String password = emp.getAccount().getPassword();
                    return !(username.equalsIgnoreCase("admin") && password.equals("123456"));
                })
                .collect(Collectors.toList());

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Danh sách lương");

            // Style: Title
            CellStyle titleStyle = workbook.createCellStyle();
            Font titleFont = workbook.createFont();
            titleFont.setFontHeightInPoints((short) 14);
            titleFont.setBold(true);
            titleStyle.setFont(titleFont);
            titleStyle.setAlignment(HorizontalAlignment.CENTER);

            // Style: Header
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            headerStyle.setFillForegroundColor(IndexedColors.LIGHT_YELLOW.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setBorderBottom(BorderStyle.THIN);
            headerStyle.setBorderTop(BorderStyle.THIN);
            headerStyle.setBorderLeft(BorderStyle.THIN);
            headerStyle.setBorderRight(BorderStyle.THIN);

            // Style: Data (default)
            CellStyle dataStyle = workbook.createCellStyle();
            dataStyle.setAlignment(HorizontalAlignment.CENTER);
            dataStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            dataStyle.setBorderBottom(BorderStyle.THIN);
            dataStyle.setBorderTop(BorderStyle.THIN);
            dataStyle.setBorderLeft(BorderStyle.THIN);
            dataStyle.setBorderRight(BorderStyle.THIN);

            // Style: Text (for phone number)
            CellStyle textStyle = workbook.createCellStyle();
            DataFormat format = workbook.createDataFormat();
            textStyle.setDataFormat(format.getFormat("@")); // Text format
            textStyle.setAlignment(HorizontalAlignment.CENTER);
            textStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            textStyle.setBorderBottom(BorderStyle.THIN);
            textStyle.setBorderTop(BorderStyle.THIN);
            textStyle.setBorderLeft(BorderStyle.THIN);
            textStyle.setBorderRight(BorderStyle.THIN);

            // Title row
            Row titleRow = sheet.createRow(1);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("DANH SÁCH LƯƠNG NHÂN VIÊN");
            titleCell.setCellStyle(titleStyle);
            sheet.addMergedRegion(new CellRangeAddress(1, 1, 0, columns.length - 1));

            // Header row
            Row headerRow = sheet.createRow(2);
            for (int i = 0; i < columns.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(columns[i]);
                cell.setCellStyle(headerStyle);
                sheet.setColumnWidth(i, switch (i) {
                    case 2 -> 40 * 256;
                    case 3 -> 20 * 256;
                    default -> 25 * 256;
                });
            }

            int rowIdx = 3;
            for (Employee emp : employees) {
                boolean exists = salaryRepository.findAll().stream()
                        .anyMatch(s -> s.getEmployee().getId().equals(emp.getId()));
                if (exists) continue;

                Row row = sheet.createRow(rowIdx++);
                String fullName = emp.getLastName() + " " + emp.getFirstName();

                String[] values = {
                        emp.getCode(),
                        fullName,
                        Optional.ofNullable(emp.getEmail()).orElse(""),
                        Optional.ofNullable(emp.getPhone()).orElse(""),
                        (emp.getAccount() != null && emp.getAccount().getRole() != null)
                                ? emp.getAccount().getRole().name()
                                : "",
                        ""
                };

                for (int i = 0; i < values.length; i++) {
                    Cell cell = row.createCell(i);
                    cell.setCellValue(values[i]);

                    if (i == 3) {
                        cell.setCellStyle(textStyle);
                    } else {
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

                    String displayName = "";
                    if (code != null && !code.isBlank()) {
                        displayName =  code;
                    }

                    // Validate salaryStr not null or empty
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
                                " không đúng định dạng . Lương cơ bản phải là số tự nhiên, vui lòng kiểm tra lại.");
                        failCount++;
                        continue;
                    }

                    Optional<Employee> employeeOpt = Optional.empty();
                    if (email != null && !email.isBlank()) {
                        employeeOpt = employeeRepository.findByEmail(email);
                    }
                    if (employeeOpt.isEmpty() && phone != null && !phone.isBlank()) {
                        employeeOpt = employeeRepository.findByPhone(phone);
                    }

                    if (employeeOpt.isPresent()) {
                        Employee employee = employeeOpt.get();

                        String dbFullName = (employee.getLastName() + " " + employee.getFirstName()).trim().toLowerCase();
                        String excelFullName = fullName != null ? fullName.trim().toLowerCase() : "";

                        boolean nameMatch = normalize(dbFullName).equals(normalize(excelFullName));
                        boolean emailMatch = email.equalsIgnoreCase(employee.getEmail());
                        boolean phoneMatch = phone.equals(employee.getPhone());
                        boolean roleMatch = employee.getAccount() != null
                                && employee.getAccount().getRole() != null
                                && role.equalsIgnoreCase(employee.getAccount().getRole().name());

                        if (!(nameMatch && emailMatch && phoneMatch && roleMatch)) {
                            errors.add("Thông tin của nhân viên " + displayName + " không khớp với hệ thống");
                            failCount++;
                            continue;
                        }

                        boolean alreadyExists = salaryRepository.findAll().stream()
                                .anyMatch(s -> s.getEmployee().getId().equals(employee.getId()));
                        if (alreadyExists) continue;

                        Salary salary = new Salary();
                        salary.setEmployee(employee);
                        salary.setBaseSalary(baseSalary);
                        salary.setCreatedAt(LocalDateTime.now());
                        salary.setCreatedBy(getCurrentUsername());
                        salary.setStatus(SalaryStatus.PENDING);

                        salaryRepository.save(salary);
                        successCount++;

                    } else {
                        errors.add("Không tìm thấy nhân viên " + displayName );
                        failCount++;
                    }

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
