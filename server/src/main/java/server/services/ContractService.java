package server.services;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

import org.apache.poi.openxml4j.exceptions.InvalidFormatException;
import org.apache.poi.util.Units;
import org.apache.poi.xwpf.usermodel.*;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import server.dtos.Contracts.ContractRequest;
import server.dtos.Contracts.ContractResponse;
import server.models.Account;
import server.models.Contract;
import server.models.Employee;
import server.models.SignatureSample;
import server.models.enums.ContractStatus;
import server.models.enums.ContractType;
import server.models.enums.Role;
import server.repositories.AccountRepository;
import server.repositories.ContractRepository;
import server.repositories.EmployeeRepository;
import server.repositories.SignatureSampleRepository;
import server.utils.ApiResponse;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.IOException;

import java.math.BigDecimal;
import java.math.RoundingMode;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class ContractService {

    private final ContractRepository contractRepository;
    private final EmployeeRepository employeeRepository;
    private final SignatureSampleRepository signatureSampleRepository;
    private final AccountRepository accountRepository;
    private final EmailService emailService;


    // ===== VALIDATION CONSTANTS =====
    private static final int PROBATION_MAX_DAYS   = 64;  // thử việc tối đa 64 ngày
    private static final int TEMPORARY_MAX_MONTHS = 12;  // thời vụ tối đa 12 tháng
    private static final String CODE_PREFIX       = "NEX";

    // Chỉ xét chồng lấn cho các trạng thái này
    private static final Set<ContractStatus> OVERLAP_STATUSES =
            EnumSet.of(ContractStatus.PENDING, ContractStatus.SIGNED_BY_MANAGER, ContractStatus.ACTIVE);

    // ===== SIGN TOKENS (trong template Word) =====
    private static final String[] MANAGER_SIGN_TOKENS  = {
            "{giám đốc ký}", "{giam doc ky}", "{ký bên A}", "{ky ben A}", "{ký nsdlđ}", "{ky nsdld}"
    };
    private static final String[] EMPLOYEE_SIGN_TOKENS = {
            "{nhân viên ký}", "{nhan vien ky}", "{ký bên B}", "{ky ben B}",
            "{người lao động ký}", "{nguoi lao dong ky}", "{ký nld}", "{ky nld}"
    };

    // ================== Helpers ==================
    private Account getCurrentAccount() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getPrincipal() == null) return null;
        try {
            return (Account) auth.getPrincipal();
        } catch (ClassCastException e) {
            return null;
        }
    }

    private String safe(String s) { return s == null ? "" : s; }

    private ContractResponse mapToResponse(Contract e) {
        ContractResponse dto = new ContractResponse();
        dto.setId(e.getId());
        dto.setContractCode(e.getContractCode());

        Employee emp = e.getEmployee();
        if (emp != null) {
            dto.setEmployeeId(emp.getId());
            dto.setEmployeeName((safe(emp.getFirstName()) + " " + safe(emp.getLastName())).trim());
            try {
                Account acc = emp.getAccount();
                if (acc != null && acc.getRole() != null) {
                    dto.setEmployeeRole(acc.getRole().name());
                }
            } catch (Exception ignored) { /* mô hình không có getAccount() */ }
        }

        // nếu ContractResponse của bạn có trường createdAt thì bật dòng dưới
        // dto.setCreatedAt(e.getCreatedAt());

        dto.setStartDate(e.getStartDate());
        dto.setEndDate(e.getEndDate());
        dto.setType(e.getType() != null ? e.getType().name() : null);
        dto.setStatus(e.getStatus() != null ? e.getStatus().name() : null);
        dto.setNote(e.getNote());
        dto.setManagerSignature(e.getManagerSignature());
        dto.setEmployeeSignature(e.getEmployeeSignature());
        dto.setBasicSalary(e.getBasicSalary());
        return dto;
    }

    // ===== CODE HELPERS =====

    // NEX-YYYY-SSSS  (ví dụ NEX-2025-0001)
    private String normalizeAndValidateCode(String raw) {
        if (raw == null) return null;
        String code = raw.trim().toUpperCase();
        if (!code.matches("^" + CODE_PREFIX + "-\\d{4}-\\d{4}$")) return null;
        return code;
    }

    private int extractYearFromCode(String code) {
        return Integer.parseInt(code.substring(CODE_PREFIX.length() + 1, CODE_PREFIX.length() + 5)); // NEX-YYYY-....
    }

    private int extractSeqFromCode(String code) {
        return Integer.parseInt(code.substring(code.length() - 4)); // 4 số cuối
    }

    private int findMaxSeqOfYear(int year) {
        int max = 0;
        for (Contract c : contractRepository.findAll()) {
            String cc = c.getContractCode();
            if (cc == null) continue;
            String up = cc.trim().toUpperCase();
            if (up.matches("^" + CODE_PREFIX + "-" + year + "-\\d{4}$")) {
                int seq = extractSeqFromCode(up);
                if (seq > max) max = seq;
            }
        }
        return max;
    }

    private String nextCodeForYear(int year) {
        int next = findMaxSeqOfYear(year) + 1;
        return String.format(CODE_PREFIX + "-%d-%04d", year, next);
    }

    // ===== OTHER VALIDATION HELPERS =====

    // endDate > startDate; startDate không được quá khứ (today OK)
    private String validateDates(LocalDate start, LocalDate end) {
        if (start == null || end == null) return "start-and-end-date-required";
        if (!end.isAfter(start)) return "end-date-must-be-after-start-date";
        if (start.isBefore(LocalDate.now())) return "start-date-in-past";
        return null;
    }

    private boolean hasOverlapOnEmployee(Long excludeId, Long employeeId, LocalDate start, LocalDate end) {
        for (Contract c : contractRepository.findAll()) {
            if (c.getEmployee() == null || c.getEmployee().getId() == null) continue;
            if (!c.getEmployee().getId().equals(employeeId)) continue;
            if (excludeId != null && excludeId.equals(c.getId())) continue;
            if (!OVERLAP_STATUSES.contains(c.getStatus())) continue;

            LocalDate s = c.getStartDate(), e = c.getEndDate();
            if (s == null || e == null) continue;
            boolean overlap = !(e.isBefore(start) || s.isAfter(end));
            if (overlap) return true;
        }
        return false;
    }

    private LocalDate resolveEmployeeBirthDate(Employee emp) {
        String[] getters = {"getBirthDate", "getDateOfBirth", "getDob", "getBirthday", "getDateBirth"};
        for (String g : getters) {
            try {
                var m = emp.getClass().getMethod(g);
                Object v = m.invoke(emp);
                LocalDate ld = toLocalDate(v);
                if (ld != null) return ld;
            } catch (Exception ignored) {}
        }
        return null;
    }

    private LocalDate toLocalDate(Object v) {
        if (v == null) return null;
        if (v instanceof LocalDate ld) return ld;
        if (v instanceof LocalDateTime ldt) return ldt.toLocalDate();
        if (v instanceof java.util.Date d)
            return d.toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
        if (v instanceof String s) {
            String ss = s.trim();
            if (ss.isEmpty()) return null;
            try { return LocalDate.parse(ss); } catch (Exception ignored) {}
            String[] pats = {"dd/MM/yyyy", "dd-MM-yyyy", "yyyy/MM/dd", "yyyy-MM-dd"};
            for (String p : pats) {
                try { return LocalDate.parse(ss, DateTimeFormatter.ofPattern(p)); }
                catch (Exception ignored) {}
            }
        }
        return null;
    }

    //hàm gửi gmail khi hợp đồng active
    private String resolveEmployeeEmail(Employee emp) {
        if (emp == null) return null;
        // Ưu tiên Employee.email
        try {
            var m = emp.getClass().getMethod("getEmail");
            Object v = m.invoke(emp);
            if (v instanceof String s && !s.isBlank()) return s.trim();
        } catch (Exception ignored) {}
        // Fallback: username của Account nếu là email
        try {
            var mAcc = emp.getClass().getMethod("getAccount");
            Object accObj = mAcc.invoke(emp);
            if (accObj instanceof Account acc) {
                String u = acc.getUsername();
                if (u != null && u.contains("@")) return u.trim();
            }
        } catch (Exception ignored) {}
        return null;
    }

    private String fullName(Employee e) {
        if (e == null) return "";
        String first = e.getFirstName() != null ? e.getFirstName().trim() : "";
        String last  = e.getLastName()  != null ? e.getLastName().trim()  : "";
        return (first + " " + last).trim();
    }


    // ================= CRUD + PERMISSIONS =================

    // HR & MANAGER thấy tất cả; role khác chỉ thấy hợp đồng của chính mình
    public ApiResponse<List<ContractResponse>> getAll() {
        Account cur = getCurrentAccount();
        if (cur == null) return ApiResponse.unauthorized();

        List<Contract> list;
        if (cur.getRole() == Role.HR || cur.getRole() == Role.MANAGER) {
            list = contractRepository.findAll();
        } else {
            Long myEmpId = cur.getEmployee() != null ? cur.getEmployee().getId() : null;
            list = contractRepository.findAll().stream()
                    .filter(c -> c.getEmployee() != null && c.getEmployee().getId() != null
                            && Objects.equals(c.getEmployee().getId(), myEmpId))
                    .collect(Collectors.toList());
        }

        List<ContractResponse> dtos = list.stream().map(this::mapToResponse).collect(Collectors.toList());
        return ApiResponse.success(dtos, "list-contract-success");
    }

    // HR & MANAGER xem được; role khác chỉ xem hợp đồng của mình
    public ApiResponse<ContractResponse> getById(Long id) {
        Account cur = getCurrentAccount();
        if (cur == null) return ApiResponse.unauthorized();

        Contract c = contractRepository.findById(id).orElse(null);
        if (c == null) return ApiResponse.notfound("contract-not-found");

        if (cur.getRole() == Role.HR || cur.getRole() == Role.MANAGER) {
            return ApiResponse.success(mapToResponse(c), "contract-detail-success");
        }
        Long myEmpId = cur.getEmployee() != null ? cur.getEmployee().getId() : null;
        if (c.getEmployee() != null && Objects.equals(c.getEmployee().getId(), myEmpId)) {
            return ApiResponse.success(mapToResponse(c), "contract-detail-success");
        }
        return ApiResponse.badRequest("forbidden");
    }

    // Chỉ HR được tạo
    public ApiResponse<ContractResponse> create(ContractRequest req) {
        Account cur = getCurrentAccount();
        if (cur == null) return ApiResponse.unauthorized();
        if (cur.getRole() != Role.HR) return ApiResponse.badRequest("only-hr-can-create");

        Contract e = new Contract();

        String err = mapRequestToEntity(req, e, true); // isCreate = true
        if (err != null) return ApiResponse.badRequest(err);

        // default state when creating
        e.setStatus(ContractStatus.PENDING);
        e.setManagerSignature(null);
        e.setEmployeeSignature(null);

        Contract saved = contractRepository.save(e);
        return ApiResponse.created(mapToResponse(saved), "create-contract-success");
    }

    // Chỉ HR được cập nhật
    public ApiResponse<ContractResponse> update(Long id, ContractRequest req) {
        Account cur = getCurrentAccount();
        if (cur == null) return ApiResponse.unauthorized();
        if (cur.getRole() != Role.HR) return ApiResponse.badRequest("only-hr-can-update");

        Contract e = contractRepository.findById(id).orElse(null);
        if (e == null) return ApiResponse.notfound("contract-not-found");

        // Chỉ cho update khi PENDING hoặc EXPIRED
        if (e.getStatus() != ContractStatus.PENDING && e.getStatus() != ContractStatus.EXPIRED) {
            return ApiResponse.badRequest("only-pending-or-expired-can-update");
        }

        String err = mapRequestToEntity(req, e, false); // isCreate = false
        if (err != null) return ApiResponse.badRequest(err);

        Contract saved = contractRepository.save(e);
        return ApiResponse.success(mapToResponse(saved), "update-contract-success");
    }

    // Chỉ HR được xóa
    public ApiResponse<?> delete(Long id) {
        Account cur = getCurrentAccount();
        if (cur == null) return ApiResponse.unauthorized();
        if (cur.getRole() != Role.HR) return ApiResponse.badRequest("only-hr-can-delete");

        Contract e = contractRepository.findById(id).orElse(null);
        if (e == null) return ApiResponse.notfound("contract-not-found");

        if (e.getStatus() != ContractStatus.PENDING) {
            return ApiResponse.badRequest("only-pending-can-delete");
        }
        contractRepository.delete(e);
        return ApiResponse.success(null, "delete-contract-success");
    }

    /**
     * Map + VALIDATE theo nghiệp vụ. Trả null nếu OK, trả message key nếu lỗi.
     * @param isCreate true khi tạo mới; false khi cập nhật
     */
    private String mapRequestToEntity(ContractRequest req, Contract e, boolean isCreate) {
        // ===== 1) CONTRACT CODE =====
        int currentYear = LocalDate.now().getYear();
        String raw = req.getContractCode() == null ? "" : req.getContractCode().trim().toUpperCase();

        // tự sinh nếu để trống
        if (raw.isEmpty()) raw = nextCodeForYear(currentYear);

        String code = normalizeAndValidateCode(raw);
        if (code == null) return "invalid-contract-code-format"; // không đúng NEX-YYYY-SSSS

        int yearInCode = extractYearFromCode(code);
        if (yearInCode != currentYear) return "contract-code-year-invalid"; // năm trong mã phải bằng năm hiện tại

        boolean codeChanged = e.getId() == null || !code.equalsIgnoreCase(e.getContractCode());
        if (isCreate || codeChanged) {
            int expectedNext = findMaxSeqOfYear(currentYear) + 1;
            int seq = extractSeqFromCode(code);
            if (seq != expectedNext) return "contract-code-sequence-invalid";
            if (contractRepository.existsByContractCode(code)) return "contract-code-exists";
        }
        e.setContractCode(code);

        // ===== 2) EMPLOYEE =====
        if (req.getEmployeeId() == null) return "employee-required";
        Employee emp = employeeRepository.findById(req.getEmployeeId()).orElse(null);
        if (emp == null) return "employee-not-found";
        e.setEmployee(emp);

        // ===== 3) DATES =====
        LocalDate start = req.getStartDate();
        LocalDate end   = req.getEndDate();
        String dateErr  = validateDates(start, end);
        if (dateErr != null) return dateErr;

        long days = ChronoUnit.DAYS.between(start, end) + 1; // inclusive
        if (days < 1) return "invalid-contract-duration";

        e.setStartDate(start);
        e.setEndDate(end);

        // ===== 4) TYPE =====
        ContractType type;
        try {
            type = ContractType.valueOf(req.getType().trim().toUpperCase());
        } catch (Exception ex) {
            return "invalid-contract-type";
        }
        if (type == ContractType.PROBATION && days > PROBATION_MAX_DAYS) {
            return "probation-too-long";
        }
        if (type == ContractType.TEMPORARY) {
            long months = ChronoUnit.MONTHS.between(
                    start.withDayOfMonth(1),
                    end.withDayOfMonth(1)
            ) + 1; // inclusive
            if (months > TEMPORARY_MAX_MONTHS) return "temporary-too-long";
        }
        e.setType(type);

        // ===== 5) OVERLAP =====
        Long excludeId = e.getId(); // null khi create
        if (hasOverlapOnEmployee(excludeId, emp.getId(), start, end)) {
            return "employee-contract-overlap";
        }

        // ===== 6) SALARY > 0 (numeric) =====
        BigDecimal salary = req.getBasicSalary();
        if (salary == null) return "invalid-basic-salary";
        if (salary.compareTo(BigDecimal.ZERO) <= 0) return "invalid-basic-salary"; // phải > 0
        salary = salary.setScale(2, RoundingMode.HALF_UP);
        e.setBasicSalary(salary);

        // ===== 7) NOTE =====
        e.setNote(req.getNote());

        return null;
    }

    // =============== SIGN ===============
    public ApiResponse<ContractResponse> signContract(
            HttpServletRequest request,
            Long contractId,
            String signerRole,
            String signatureBase64) {

        Contract c = contractRepository.findById(contractId).orElse(null);
        if (c == null) return ApiResponse.notfound("contract-not-found");

        Account current = getCurrentAccount();
        if (current == null) return ApiResponse.unauthorized();

        String roleParam = signerRole == null ? "" : signerRole.trim().toUpperCase();
        boolean useSavedSignature = (signatureBase64 == null || signatureBase64.isBlank());

        // Nếu không gửi chữ ký mới -> lấy signature đã lưu
        if (useSavedSignature) {
            SignatureSample sample = signatureSampleRepository.findByAccount(current).orElse(null);
            if (sample == null || sample.getSignatureBase64() == null || sample.getSignatureBase64().isBlank()) {
                return ApiResponse.badRequest("no-saved-signature");
            }
            signatureBase64 = sample.getSignatureBase64();
        } else {
            // Lưu/ghi đè signature mẫu để dùng lần sau
            SignatureSample sample = signatureSampleRepository.findByAccount(current)
                    .orElse(SignatureSample.builder().account(current).build());
            sample.setSignatureBase64(signatureBase64);
            signatureSampleRepository.save(sample);
        }

        switch (roleParam) {
            case "MANAGER":
                // Chỉ tài khoản role MANAGER mới được ký dạng MANAGER
                if (current.getRole() != Role.MANAGER) {
                    return ApiResponse.badRequest("only-manager-can-sign-as-manager");
                }
                if (c.getManagerSignature() != null) {
                    return ApiResponse.badRequest("manager-already-signed");
                }
                if (c.getStatus() != ContractStatus.PENDING) {
                    return ApiResponse.badRequest("contract-must-be-pending-for-manager-sign");
                }
                c.setManagerSignature(signatureBase64);
                c.setStatus(ContractStatus.SIGNED_BY_MANAGER);
                break;

            case "EMPLOYEE":
                // Mọi role đều được ký nếu là chính hợp đồng của mình
                Employee ce = current.getEmployee();
                if (ce == null || c.getEmployee() == null || !c.getEmployee().getId().equals(ce.getId())) {
                    return ApiResponse.badRequest("only-owner-can-sign-as-employee");
                }
                if (c.getEmployeeSignature() != null) {
                    return ApiResponse.badRequest("employee-already-signed");
                }
                if (c.getStatus() != ContractStatus.SIGNED_BY_MANAGER) {
                    return ApiResponse.badRequest("manager-must-sign-first");
                }
                c.setEmployeeSignature(signatureBase64);
                if (c.getManagerSignature() != null && c.getEmployeeSignature() != null) {
                    c.setStatus(ContractStatus.ACTIVE);
                    // Gửi email thông báo ACTIVE cho người lao động (không làm fail luồng nếu lỗi)
                    try {
                        String to = resolveEmployeeEmail(c.getEmployee());
                        if (to != null) {
                            emailService.sendContractActivatedEmailAsync(
                                    to,
                                    fullName(c.getEmployee()),
                                    c.getContractCode(),
                                    c.getType(),
                                    c.getStartDate(),
                                    c.getEndDate(),
                                    c.getBasicSalary()
                            );
                        }
                    } catch (Exception ignored) {}
                }
                break;

            default:
                return ApiResponse.badRequest("invalid-signer-role");
        }

        Contract saved = contractRepository.save(c);
        return ApiResponse.success(mapToResponse(saved), "sign-contract-success");
    }

    // =============== BULK EXPIRE (gọi từ scheduler/QA) ===============
    @Transactional
    public int expireOverdueToday() {
        return contractRepository.bulkExpire(LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")));
    }

    // ================================================================
    // =============== EXPORT WORD (template + chữ ký) ================
    // ================================================================

    /**
     * Chuẩn hóa dữ liệu Contract -> Map<String,String> cho template Mau-hop-dong-lao-dong.docx
     * Placeholder cần khớp (ví dụ): {mã hợp đồng}, {ngày}, {tháng}, {năm}, {tên giám đốc}, {tên nhân viên},
     * {giới tính}, {ngày tháng năm sinh}, {địa chỉ}, {số điện thoại}, {loại hợp đồng}, {ngày bắt đầu}, {ngày kết thúc}, {lương}
     */
    public Map<String, String> prepareContractDataForWord(Contract c) {
        Map<String, String> data = new HashMap<>();
        DateTimeFormatter dmySlash = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        DateTimeFormatter dobDash  = DateTimeFormatter.ofPattern("dd-MM-yyyy"); // theo yêu cầu 08-11-2000

        // Hợp đồng
        data.put("mã hợp đồng", safe(c.getContractCode()));
        data.put("loại hợp đồng", c.getType() != null ? c.getType().name() : "");
        data.put("ngày bắt đầu", c.getStartDate() != null ? c.getStartDate().format(dmySlash) : "");
        data.put("ngày kết thúc", c.getEndDate() != null ? c.getEndDate().format(dmySlash) : "");
        data.put("lương", c.getBasicSalary() != null ? c.getBasicSalary().toPlainString() : "");

        // Ngày/tháng/năm in đầu văn bản: ưu tiên createdAt, fallback hôm nay
        LocalDate createdDate;
        try {
            Object created = c.getCreatedAt();
            if (created instanceof LocalDateTime ldt) createdDate = ldt.toLocalDate();
            else if (created instanceof LocalDate ld) createdDate = ld;
            else if (created instanceof java.util.Date dt) createdDate = dt.toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
            else createdDate = LocalDate.now();
        } catch (Exception ex) {
            createdDate = LocalDate.now();
        }
        data.put("ngày",  String.valueOf(createdDate.getDayOfMonth()));
        data.put("tháng", String.valueOf(createdDate.getMonthValue()));
        data.put("năm",   String.valueOf(createdDate.getYear()));

        // Bên B – Nhân viên
        Employee emp = c.getEmployee();
        if (emp != null) {
            String fullName = (safe(emp.getFirstName()) + " " + safe(emp.getLastName())).trim();
            data.put("tên nhân viên", fullName);
            data.put("giới tính", emp.getGender() != null ? emp.getGender().name() : "");
            LocalDate dob = resolveEmployeeBirthDate(emp);
            data.put("ngày tháng năm sinh", dob != null ? dob.format(dobDash) : "");
            data.put("địa chỉ", safe(emp.getAddress()));
            data.put("số điện thoại", safe(emp.getPhone()));
        } else {
            data.put("tên nhân viên", "");
            data.put("giới tính", "");
            data.put("ngày tháng năm sinh", "");
            data.put("địa chỉ", "");
            data.put("số điện thoại", "");
        }

        // Bên A – Tên giám đốc (lấy từ bảng account role = MANAGER, ưu tiên id nhỏ nhất)
        String directorName = accountRepository.findByRole(Role.MANAGER).stream()
                .sorted(Comparator.comparingLong(a -> a.getId() == null ? Long.MAX_VALUE : a.getId()))
                .map(acc -> {
                    Employee e = acc.getEmployee();
                    String first = (e != null && e.getFirstName() != null) ? e.getFirstName().trim() : "";
                    String last  = (e != null && e.getLastName()  != null) ? e.getLastName().trim()  : "";
                    String full  = (first + " " + last).trim();
                    return full.isBlank()
                            ? (acc.getUsername() != null ? acc.getUsername() : "")
                            : full;
                })
                .findFirst()
                .orElse("");
        data.put("tên giám đốc", directorName);

        return data;
    }

    /** Export Word từ template, thay text + chèn ảnh chữ ký; bảo toàn Tab, tránh đè nhau */
    public byte[] exportContractToWord(Map<String, String> data,
                                       String managerSignatureBase64,
                                       String employeeSignatureBase64)
            throws IOException, InvalidFormatException {

        try (InputStream template = getClass().getClassLoader()
                .getResourceAsStream("templates/Mau-hop-dong-lao-dong.docx");
             XWPFDocument document = new XWPFDocument(template)) {

            byte[] managerSig  = decodeBase64Image(managerSignatureBase64);
            byte[] employeeSig = decodeBase64Image(employeeSignatureBase64);

            Set<Integer> seen = new HashSet<>();

            // Paragraphs ngoài bảng
            for (XWPFParagraph p : document.getParagraphs()) {
                int id = System.identityHashCode(p);
                if (seen.add(id)) {
                    replaceParagraphTextAndSignKeepTabs(p, data, managerSig, employeeSig);
                }
            }

            // Paragraphs trong bảng
            for (XWPFTable table : document.getTables()) {
                for (XWPFTableRow row : table.getRows()) {
                    for (XWPFTableCell cell : row.getTableCells()) {
                        for (XWPFParagraph p : cell.getParagraphs()) {
                            int id = System.identityHashCode(p);
                            if (seen.add(id)) {
                                replaceParagraphTextAndSignKeepTabs(p, data, managerSig, employeeSig);
                            }
                        }
                    }
                }
            }

            try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                document.write(out);
                return out.toByteArray();
            }
        }
    }

    /** Tiện ích: Export trực tiếp từ contractId (tự lấy chữ ký DB) */
    public byte[] exportContractToWord(Long contractId)
            throws IOException, InvalidFormatException {
        Contract c = contractRepository.findById(contractId).orElse(null);
        if (c == null) throw new IllegalArgumentException("contract-not-found");
        Map<String, String> data = prepareContractDataForWord(c);
        return exportContractToWord(data, c.getManagerSignature(), c.getEmployeeSignature());
    }

    // ---------- Private helpers for export ----------

    private void replaceParagraphTextAndSignKeepTabs(XWPFParagraph p,
                                                     Map<String,String> data,
                                                     byte[] managerSig,
                                                     byte[] employeeSig)
            throws InvalidFormatException, IOException {
        String text = p.getText();
        if (text == null) return;

        // 1) Replace text placeholders (ngày/tháng/năm, mã HĐ, tên NV...)
        String replaced = text;
        for (Map.Entry<String, String> e : data.entrySet()) {
            String ph = "{" + e.getKey() + "}";
            if (replaced.contains(ph)) {
                replaced = replaced.replace(ph, e.getValue() == null ? "" : e.getValue());
            }
        }

        // 2) Tìm tất cả token chữ ký (theo thứ tự xuất hiện)
        class Tok { int pos; String token; boolean isManager; }
        List<Tok> toks = new ArrayList<>();
        // manager
        for (String t : MANAGER_SIGN_TOKENS) {
            int idx = replaced.indexOf(t);
            while (idx != -1) {
                Tok tk = new Tok(); tk.pos = idx; tk.token = t; tk.isManager = true;
                toks.add(tk);
                idx = replaced.indexOf(t, idx + t.length());
            }
        }
        // employee
        for (String t : EMPLOYEE_SIGN_TOKENS) {
            int idx = replaced.indexOf(t);
            while (idx != -1) {
                Tok tk = new Tok(); tk.pos = idx; tk.token = t; tk.isManager = false;
                toks.add(tk);
                idx = replaced.indexOf(t, idx + t.length());
            }
        }
        toks.sort(Comparator.comparingInt(t -> t.pos));

        // 3) Rebuild paragraph (clear runs trước), bảo toàn Tab
        for (int i = p.getRuns().size() - 1; i >= 0; i--) p.removeRun(i);

        int cur = 0;
        for (Tok tk : toks) {
            // phần text trước token
            if (tk.pos > cur) writeTextWithTabs(p, replaced.substring(cur, tk.pos));

            // chèn ảnh tương ứng
            byte[] sig = tk.isManager ? managerSig : employeeSig;
            if (sig != null) {
                XWPFRun r = p.createRun();
                r.addPicture(new ByteArrayInputStream(sig),
                        XWPFDocument.PICTURE_TYPE_PNG,
                        tk.isManager ? "manager-sign.png" : "employee-sign.png",
                        Units.toEMU(120),
                        Units.toEMU(50));
            }
            cur = tk.pos + tk.token.length();
        }
        // phần text sau token cuối
        if (cur < replaced.length()) writeTextWithTabs(p, replaced.substring(cur));
    }

    private void writeTextWithTabs(XWPFParagraph p, String s) {
        if (s == null || s.isEmpty()) return;
        String[] parts = s.split("\t", -1);
        for (int i = 0; i < parts.length; i++) {
            if (!parts[i].isEmpty()) {
                XWPFRun r = p.createRun();
                r.setText(parts[i]);
            }
            if (i < parts.length - 1) {
                XWPFRun tabRun = p.createRun();
                tabRun.addTab();
            }
        }
    }

    private byte[] decodeBase64Image(String base64) {
        if (base64 == null || base64.isBlank()) return null;
        String b64 = base64.trim();
        if (b64.contains(",")) b64 = b64.substring(b64.indexOf(',') + 1);
        try {
            return Base64.getDecoder().decode(b64);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }
}
