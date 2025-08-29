package server.services;

import jakarta.transaction.Transactional;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import server.dtos.CreateEmployeeDto;
import server.dtos.ImportEmployeeRow;
import server.dtos.ImportEmployeesResult;
import server.models.Account;
import server.models.Employee;
import server.models.enums.Gender;
import server.models.enums.Role;
import server.repositories.EmployeeRepository;
import server.utils.AccountGenerator;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;

@Service
@RequiredArgsConstructor
public class EmployeeExcelImportService {
    private final EmployeeRepository employeeRepository;
    private final Validator validator;
    private final AccountGenerator accountGenerator; // giống nơi bạn đang dùng ở create()
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    private static final List<String> HEADERS = List.of(
            "firstName","lastName","email","phone","address","gender","dateBirth","role"
    );

    /** 1) Preview: validate + check DB từng dòng */
    public ImportEmployeesResult preview(MultipartFile file) throws Exception {
        var rows = parseExcel(file);

        for (ImportEmployeeRow r : rows) {
            CreateEmployeeDto d = r.getData();

            // Bean Validation
            for (ConstraintViolation<CreateEmployeeDto> v : validator.validate(d)) {
                String field = v.getPropertyPath().toString();
                r.getErrors().put(field, v.getMessage());
            }
            // Parse enum để bắt lỗi format
            if (!r.getErrors().containsKey("gender")) {
                try { Gender.valueOf(d.getGender()); }
                catch (Exception e) { r.getErrors().put("gender", "invalid-gender"); }
            }
            if (!r.getErrors().containsKey("role")) {
                try { Role.valueOf(d.getRole()); }
                catch (Exception e) { r.getErrors().put("role", "invalid-role"); }
            }

            // Check DB từng dòng (giống create)
            if (d.getEmail() != null && !d.getEmail().isBlank()) {
                boolean existsEmail = employeeRepository.findByEmail(d.getEmail().toLowerCase()).isPresent();
                if (existsEmail) r.getErrors().put("email", "email-already-exists");
            }
            if (d.getPhone() != null && !d.getPhone().isBlank()) {
                boolean existsPhone = employeeRepository.findByPhone(d.getPhone()).isPresent();
                if (existsPhone) r.getErrors().put("phone","phone-already-exists");
            }
        }

        boolean ok = rows.stream().allMatch(x -> x.getErrors().isEmpty());
        return new ImportEmployeesResult(rows.size(), ok ? rows.size() : 0, ok, rows);
    }

    /** 2) Import thật: có lỗi -> không lưu; không lỗi -> tạo account & lưu */
    @Transactional
    public ImportEmployeesResult importAndSave(MultipartFile file) throws Exception {
        ImportEmployeesResult pre = preview(file);
        if (!pre.isSuccess()) return pre;

        // Lưu giống create()
        record MailRow(String email, String username, String rawPassword) {}
        List<Employee> toSave = new ArrayList<>();
        List<MailRow> mails = new ArrayList<>();

        for (ImportEmployeeRow r : pre.getRows()) {
            CreateEmployeeDto req = r.getData();

            String username = accountGenerator.generateUniqueUsername(req.getFirstName(), req.getLastName());
            String rawPass = accountGenerator.generatePassword();

            Account acc = new Account();
            acc.setUsername(username);
            acc.setPassword(passwordEncoder.encode(rawPass));
            acc.setRole(Role.valueOf(req.getRole()));
            acc.setEnabled(true);

            Employee e = new Employee();
            e.setFirstName(req.getFirstName());
            e.setLastName(req.getLastName());
            e.setEmail(req.getEmail().toLowerCase());
            e.setPhone(req.getPhone());
            e.setAddress(req.getAddress());
            e.setGender(Gender.valueOf(req.getGender()));
            e.setDateBirth(req.getDateBirth());
            e.setAccount(acc);

            toSave.add(e);
            employeeRepository.saveAndFlush(e);
            mails.add(new MailRow(req.getEmail(), username, rawPass));
        }

        for (MailRow m : mails) {
            emailService.sendAccountCreatedEmail(m.email(), m.username(), m.rawPassword());
        }

        pre.setInserted(toSave.size());
        pre.setSuccess(true);
        return pre;
    }

    /* ---------------- helpers ---------------- */

    private List<ImportEmployeeRow> parseExcel(MultipartFile file) throws Exception {
        try (InputStream in = file.getInputStream(); Workbook wb = new XSSFWorkbook(in)) {
            Sheet sheet = wb.getSheetAt(0);
            if (sheet == null || sheet.getPhysicalNumberOfRows() < 2) return List.of();

            // Nếu có hàng 1 (keys ẩn) thì dùng, ngược lại dùng hàng 0
            Row keyRow = sheet.getRow(1) != null && !sheet.getRow(1).getZeroHeight() ? sheet.getRow(1) : null;
            if (keyRow == null) keyRow = sheet.getRow(1); // vẫn dùng dù đã ẩn (ZeroHeight true)
            if (keyRow == null || isBlankRow(keyRow)) keyRow = sheet.getRow(0);

            Map<String, Integer> idx = new HashMap<>();
            for (Cell c : keyRow) {
                String val = str(c);
                if (val != null) idx.put(val.trim(), c.getColumnIndex());
            }
            for (String h : HEADERS)
                if (!idx.containsKey(h))
                    throw new IllegalArgumentException("missing-column: " + h);

            // Nếu có row keys ở dòng 1 thì dataStart = 2, ngược lại = 1
            int dataStart = keyRow.getRowNum() == 1 ? 2 : 1;

            List<ImportEmployeeRow> rows = new ArrayList<>();
            for (int i = dataStart; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                CreateEmployeeDto d = new CreateEmployeeDto();
                d.setFirstName(val(row, idx.get("firstName")));
                d.setLastName(val(row, idx.get("lastName")));
                d.setEmail(val(row, idx.get("email")));
                d.setPhone(val(row, idx.get("phone")));
                d.setAddress(val(row, idx.get("address")));
                d.setGender(val(row, idx.get("gender")));
                d.setRole(val(row, idx.get("role")));
                d.setDateBirth(parseDob(row.getCell(idx.get("dateBirth")), val(row, idx.get("dateBirth"))));

                // i + 1: hiển thị đúng số dòng Excel
                rows.add(new ImportEmployeeRow(i + 1, d, new LinkedHashMap<>()));
            }
            return rows;
        }
    }

    private boolean isBlankRow(Row r) {
        if (r == null) return true;
        for (Cell c : r) {
            String s = str(c);
            if (s != null && !s.isBlank()) return false;
        }
        return true;
    }

    private LocalDate parseDob(Cell cell, String s) {
        // Nếu ô là dạng số và được format là Date -> convert thành LocalDate
        if (cell != null && cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
            Date jDate = cell.getDateCellValue();
            return jDate.toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
        }
        // Nếu có chuỗi ngày tháng -> parse thành LocalDate
        if (s != null && !s.isBlank()) return LocalDate.parse(s.trim());
        // Nếu trống -> null
        return null;
    }

    private String val(Row r, int i) {
        // Lấy cell tại cột i trong dòng r và trả về giá trị dạng chuỗi
        return str(r.getCell(i));
    }

    private String str(Cell c) {
        if (c == null) return null; // Nếu cell rỗng

        // Xử lý theo kiểu dữ liệu của cell
        return switch (c.getCellType()) {
            case STRING -> c.getStringCellValue(); // Text
            case NUMERIC -> DateUtil.isCellDateFormatted(c)
                    // Nếu là dạng date -> chuyển sang yyyy-MM-dd
                    ? c.getLocalDateTimeCellValue().toLocalDate().toString()
                    // Nếu là số thường -> ép sang long rồi string
                    : String.valueOf((long) c.getNumericCellValue());
            case BOOLEAN -> String.valueOf(c.getBooleanCellValue()); // true/false
            case FORMULA -> c.getCellFormula(); // Trả về công thức (nếu có)
            default -> null; // Các kiểu khác -> null
        };
    }

    public byte[] buildTemplate() throws Exception {
        try (org.apache.poi.xssf.usermodel.XSSFWorkbook wb = new org.apache.poi.xssf.usermodel.XSSFWorkbook()) {
            var helper = wb.getCreationHelper();

            // ===== Sheet employees (đặt trước tiên và active) =====
            var sheet = wb.createSheet("employees");
            wb.setActiveSheet(wb.getSheetIndex(sheet));
            wb.setSelectedTab(0);

            // Styles
            var headerStyle = wb.createCellStyle();
            var headerFont = wb.createFont(); headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.LIGHT_CORNFLOWER_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            headerStyle.setBorderBottom(BorderStyle.THIN);

            var requiredStyle = wb.createCellStyle();
            var reqFont = wb.createFont(); reqFont.setBold(true); reqFont.setColor(IndexedColors.RED.getIndex());
            requiredStyle.setFont(reqFont);

            var dateStyle = wb.createCellStyle();
            dateStyle.setDataFormat(wb.createDataFormat().getFormat("yyyy-mm-dd"));

            // Pretty headers (hiển thị)
            String[][] prettyHeaders = {
                    {"First Name","firstName",  "*"},   // [label, key, requiredFlag]
                    {"Last Name","lastName",    "*"},
                    {"Email","email",           "*"},
                    {"Phone","phone",           "*"},
                    {"Address","address",       "*"},
                    {"Gender","gender",         "*"},
                    {"Date of Birth","dateBirth","*"},
                    {"Role","role",             "*"}
            };

            // Row 0: labels đẹp
            var rowLabel = sheet.createRow(0);
            for (int c = 0; c < prettyHeaders.length; c++) {
                var cell = rowLabel.createCell(c);
                cell.setCellValue(prettyHeaders[c][0]);
                cell.setCellStyle(headerStyle);
                sheet.autoSizeColumn(c);

                // đánh dấu required bằng comment nhỏ
                if ("*".equals(prettyHeaders[c][2])) {
                    var drawing = sheet.createDrawingPatriarch();
                    var anchor = helper.createClientAnchor();
                    anchor.setCol1(c); anchor.setCol2(c + 2);
                    anchor.setRow1(0); anchor.setRow2(2);
                    var comment = drawing.createCellComment(anchor);
                    comment.setString(helper.createRichTextString("Required"));
                    cell.setCellComment(comment);
                }
            }

            // Row 1: machine keys (ẩn đi), parser sẽ đọc hàng này
            var rowKeys = sheet.createRow(1);
            for (int c = 0; c < prettyHeaders.length; c++) {
                rowKeys.createCell(c).setCellValue(prettyHeaders[c][1]);
            }
            rowKeys.setZeroHeight(true); // Ẩn hàng keys

            // Freeze header + autofilter (chỉ row labels)
            sheet.createFreezePane(0, 2); // cố định 2 hàng đầu (label + keys ẩn)
            sheet.setAutoFilter(new org.apache.poi.ss.util.CellRangeAddress(0, 0, 0, prettyHeaders.length - 1));

            // Rộng cột
            int[] widths = {5000, 5000, 8000, 5000, 8000, 5000, 5000, 6000};
            for (int i = 0; i < widths.length; i++) sheet.setColumnWidth(i, widths[i]);

            // Dòng ví dụ (row 2)
            var ex = sheet.createRow(2);
            ex.createCell(0).setCellValue("Nguyen");
            ex.createCell(1).setCellValue("Van A");
            ex.createCell(2).setCellValue("nguyenvana@example.com");
            ex.createCell(3).setCellValue("0912345678");
            ex.createCell(4).setCellValue("46 Ly Te Xuyen, Hiep Binh, HCM");
            ex.createCell(5).setCellValue("MALE"); // có dropdown
            var dateCell = ex.createCell(6);
            dateCell.setCellValue("2000-10-05");
            dateCell.setCellStyle(dateStyle);
            ex.createCell(7).setCellValue("EMPLOYEE"); // có dropdown

            sheet.setDefaultColumnStyle(6, dateStyle);

            // ===== Sheet ẩn lists cho dropdown =====
            var listSheet = wb.createSheet("lists");
            String[] genders = Arrays.stream(Gender.values()).map(Enum::name).toArray(String[]::new);
            String[] roles   = Arrays.stream(Role.values()).map(Enum::name).toArray(String[]::new);

            for (int i = 0; i < genders.length; i++) listSheet.createRow(i).createCell(0).setCellValue(genders[i]);
            for (int i = 0; i < roles.length; i++) {
                var r = listSheet.getRow(i) == null ? listSheet.createRow(i) : listSheet.getRow(i);
                r.createCell(1).setCellValue(roles[i]);
            }
            wb.setSheetHidden(wb.getSheetIndex(listSheet), true);

            // Named ranges
            var genderName = wb.createName(); genderName.setNameName("GENDERS");
            genderName.setRefersToFormula("lists!$A$1:$A$" + genders.length);
            var roleName = wb.createName(); roleName.setNameName("ROLES");
            roleName.setRefersToFormula("lists!$B$1:$B$" + roles.length);

            // Data Validation (áp dụng cho nhiều nghìn dòng)
            var dvh = new org.apache.poi.xssf.usermodel.XSSFDataValidationHelper(sheet);
            // Gender (col 5)
            sheet.addValidationData(dvh.createValidation(
                    dvh.createFormulaListConstraint("GENDERS"),
                    new org.apache.poi.ss.util.CellRangeAddressList(2, 10000, 5, 5)
            ));
            // Role (col 7)
            sheet.addValidationData(dvh.createValidation(
                    dvh.createFormulaListConstraint("ROLES"),
                    new org.apache.poi.ss.util.CellRangeAddressList(2, 10000, 7, 7)
            ));
            // Date range (col 6)
            var dateDV = dvh.createValidation(
                    dvh.createDateConstraint(
                            org.apache.poi.ss.usermodel.DataValidationConstraint.OperatorType.BETWEEN,
                            "DATE(1900,1,1)", "TODAY()", "Invalid date"),
                    new org.apache.poi.ss.util.CellRangeAddressList(2, 10000, 6, 6)
            );
            dateDV.setShowErrorBox(true);
            sheet.addValidationData(dateDV);

            // ===== Sheet README (đặt sau) =====
            var readme = wb.createSheet("README");
            int rd = 0;
            readme.createRow(rd++).createCell(0).setCellValue("HƯỚNG DẪN:");
            readme.createRow(rd++).createCell(0).setCellValue("• Điền dữ liệu ở sheet 'employees'.");
            readme.createRow(rd++).createCell(0).setCellValue("• Các cột có dấu * là bắt buộc.");
            readme.createRow(rd++).createCell(0).setCellValue("• Gender/Role: chọn từ dropdown, không gõ tay.");
            readme.createRow(rd++).createCell(0).setCellValue("• dateBirth: yyyy-MM-dd hoặc chọn Date.");
            readme.autoSizeColumn(0);

            // Đảm bảo employees đứng đầu (phòng trường hợp IDE reorder)
            wb.setSheetOrder("employees", 0);

            try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
                wb.write(baos);
                return baos.toByteArray();
            }
        }
    }
}
