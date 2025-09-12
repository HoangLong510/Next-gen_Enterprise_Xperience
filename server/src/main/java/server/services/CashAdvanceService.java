package server.services;

import lombok.RequiredArgsConstructor;
import org.apache.poi.openxml4j.exceptions.InvalidFormatException;
import org.apache.poi.util.Units;
import org.apache.poi.xwpf.usermodel.*;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import server.dtos.CashAdvanceDto;
import server.dtos.CreateCashAdvanceDto;
import server.models.Account;
import server.models.CashAdvanceRequest;
import server.models.Task;
import server.models.enums.CashAdvanceStatus;
import server.models.enums.Role;
import server.repositories.AccountRepository;
import server.repositories.CashAdvanceRequestRepository;
import server.repositories.TaskRepository;
import server.utils.ApiResponse;

import java.io.*;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class CashAdvanceService {

    private final CashAdvanceRequestRepository repo;
    private final TaskRepository taskRepo;
    private final UploadFileService uploadFileService;
    private final NotificationService notificationService;
    private final AccountRepository accountRepo;

    /* ===================== Role checks ===================== */
    private boolean isAccountant(Account a) {
        return a != null && a.getRole() != null &&
                (a.getRole() == Role.ACCOUNTANT || a.getRole() == Role.ADMIN);
    }

    private boolean isChief(Account a) {
        return a != null && a.getRole() != null &&
                (a.getRole() == Role.CHIEFACCOUNTANT || a.getRole() == Role.ADMIN);
    }

    private boolean isDirector(Account a) {
        return a != null && a.getRole() != null &&
                (a.getRole() == Role.MANAGER || a.getRole() == Role.ADMIN);
    }

    /* ===================== Helpers ===================== */
    private String safeName(Account a) {
        if (a == null) return "";
        try {
            var emp = a.getEmployee();
            if (emp != null) {
                String last = emp.getLastName() == null ? "" : emp.getLastName().trim();
                String first = emp.getFirstName() == null ? "" : emp.getFirstName().trim();
                String full = (last + " " + first).trim().replaceAll("\\s+", " ");
                if (!full.isBlank()) return full;
            }
        } catch (Exception ignore) {
        }
        return a.getUsername() == null ? "" : a.getUsername();
    }

    private String nvl(String s, String d) {
        return (s == null || s.isBlank()) ? d : s;
    }

    /* ===================== DTO convert ===================== */
    private CashAdvanceDto toDto(CashAdvanceRequest e) {
        CashAdvanceDto d = new CashAdvanceDto();
        d.setId(e.getId());
        Task t = e.getTask();
        d.setTaskId(t != null ? t.getId() : null);
        if (t != null) {
            d.setTaskName(t.getName());
            var p = t.getPhase();
            if (p != null) {
                d.setPhaseId(p.getId());
                d.setPhaseName(p.getName());
                var proj = p.getProject();
                if (proj != null) {
                    d.setProjectId(proj.getId());
                    d.setProjectName(proj.getName());
                }
            }
        }
        d.setAmount(e.getAmount());
        d.setReason(e.getReason());
        d.setStatus(e.getStatus());
        d.setFileUrl(e.getFileUrl());
        d.setRejectNote(e.getRejectNote());
        d.setSentToChiefAt(e.getSentToChiefAt());
        d.setChiefApprovedAt(e.getChiefApprovedAt());
        d.setSentToDirectorAt(e.getSentToDirectorAt());
        d.setDirectorApprovedAt(e.getDirectorApprovedAt());
        d.setCreatedAt(e.getCreatedAt());
        d.setUpdatedAt(e.getUpdatedAt());
        return d;
    }

    /* ===================== Commands ===================== */
    @Transactional
    public ApiResponse<?> create(Account creator, CreateCashAdvanceDto payload, MultipartFile file) {
        if (payload.getTaskId() == null || payload.getAmount() == null || payload.getAmount() <= 0) {
            return ApiResponse.badRequest("invalid-params");
        }
        Task task = taskRepo.findWithPhaseAndProjectById(payload.getTaskId()).orElse(null);
        if (task == null) return ApiResponse.notfound("task-not-found");

        CashAdvanceRequest r = new CashAdvanceRequest();
        r.setTask(task);
        r.setAmount(payload.getAmount());
        r.setReason(payload.getReason());
        r.setStatus(CashAdvanceStatus.PENDING);
        r.setCreatedBy(creator);
        r.setCreatedAt(LocalDateTime.now());

        try {
            if (file != null && !file.isEmpty()) {
                String publicUrl = uploadFileService.storeFile("cash-advances", file);
                r.setFileUrl(publicUrl);
            }
        } catch (Exception ex) {
            return ApiResponse.badRequest("file-upload-failed");
        }

        repo.save(r);

        try {
            // Tạo file docx và lưu vào thư mục cash-advances
            ResponseEntity<Resource> docRes = generateDoc(r.getId());
            byte[] fileBytes = ((org.springframework.core.io.ByteArrayResource) docRes.getBody()).getByteArray();
            String savedUrl = uploadFileService.storeFileFromBytes(
                    "cash-advances",
                    "advance_" + r.getId() + ".docx",
                    fileBytes
            );
            r.setFileUrl(savedUrl);
            repo.save(r);
        } catch (Exception ex) {
            return ApiResponse.badRequest("doc-generate-failed");
        }

        return ApiResponse.success(toDto(r), "create-cash-advance-success");
    }

    /* ===================== Approvals ===================== */
    @Transactional
    public ApiResponse<?> accountantApprove(Account actor, Long id, boolean approve, String note) {
        if (!isAccountant(actor)) return ApiResponse.badRequest("only-accountant");
        var r = repo.findById(id).orElse(null);
        if (r == null) return ApiResponse.notfound("not-found");
        if (r.getStatus() != CashAdvanceStatus.PENDING)
            return ApiResponse.badRequest("must-be-pending");

        if (approve) {
            r.setStatus(CashAdvanceStatus.APPROVED_ACCOUNTANT);
            r.setApprovedBy(actor);
        } else {
            r.setStatus(CashAdvanceStatus.REJECTED);
            r.setApprovedBy(actor);
            r.setRejectNote(note);
        }
        repo.save(r);
        return ApiResponse.success(toDto(r), approve ? "accountant-approved" : "accountant-rejected");
    }

    @Transactional
    public ApiResponse<?> chiefApprove(Account actor, Long id, boolean approve, String note) {
        if (!isChief(actor)) return ApiResponse.badRequest("only-chief");
        var r = repo.findById(id).orElse(null);
        if (r == null) return ApiResponse.notfound("not-found");
        if (r.getStatus() != CashAdvanceStatus.APPROVED_ACCOUNTANT)
            return ApiResponse.badRequest("must-be-approved-by-accountant");

        if (approve) {
            r.setStatus(CashAdvanceStatus.APPROVED_CHIEF);
            r.setChiefApprovedAt(LocalDateTime.now());
            r.setChiefAssignee(actor);
        } else {
            r.setStatus(CashAdvanceStatus.REJECTED);
            r.setChiefAssignee(actor);
            r.setRejectNote(note);
        }
        repo.save(r);
        return ApiResponse.success(toDto(r), approve ? "chief-approved" : "chief-rejected");
    }

    @Transactional
    public ApiResponse<?> directorApprove(Account actor, Long id, boolean approve, String note) {
        if (!isDirector(actor)) return ApiResponse.badRequest("only-director");
        var r = repo.findById(id).orElse(null);
        if (r == null) return ApiResponse.notfound("not-found");
        if (r.getStatus() != CashAdvanceStatus.APPROVED_CHIEF)
            return ApiResponse.badRequest("must-be-approved-by-chief");

        if (approve) {
            r.setStatus(CashAdvanceStatus.APPROVED_DIRECTOR);
            r.setDirectorApprovedAt(LocalDateTime.now());
            r.setDirectorAssignee(actor);
        } else {
            r.setStatus(CashAdvanceStatus.REJECTED);
            r.setDirectorAssignee(actor);
            r.setRejectNote(note);
        }
        repo.save(r);
        return ApiResponse.success(toDto(r), approve ? "director-approved" : "director-rejected");
    }

    /* ===================== Queries ===================== */
    public ApiResponse<?> list(Account me, String statusStr, String scope) {
        Set<CashAdvanceStatus> statuses = null;
        if (statusStr != null && !statusStr.isBlank() && !"ALL".equalsIgnoreCase(statusStr)) {
            statuses = new LinkedHashSet<>();
            for (String s : statusStr.split(",")) {
                try {
                    statuses.add(CashAdvanceStatus.valueOf(s.trim().toUpperCase()));
                } catch (Exception ignore) {
                }
            }
            if (statuses.isEmpty()) statuses = null;
        }

        boolean onlyMy = "MY".equalsIgnoreCase(scope);
        List<CashAdvanceRequest> list;
        if (onlyMy) {
            list = (statuses == null)
                    ? repo.findByCreatedBy_IdOrderByIdDesc(me.getId())
                    : repo.findByCreatedBy_IdAndStatusInOrderByIdDesc(me.getId(), statuses);
        } else {
            list = (statuses == null)
                    ? repo.findAllByOrderByIdDesc()
                    : repo.findByStatusInOrderByIdDesc(statuses);
        }

        return ApiResponse.success(list.stream().map(this::toDto).toList(), "cash-advance-list");
    }

    public ApiResponse<?> myRequests(Account me) {
        var list = repo.findByCreatedBy_IdOrderByIdDesc(me.getId());
        return ApiResponse.success(list.stream().map(this::toDto).toList(), "my-cash-advance-list");
    }

    public ApiResponse<?> pendingForAccountant() {
        var list = repo.findByStatusOrderByIdDesc(CashAdvanceStatus.PENDING);
        return ApiResponse.success(list.stream().map(this::toDto).toList(), "pending-accountant");
    }

    public ApiResponse<?> pendingForChief() {
        var list = repo.findByStatusOrderByIdDesc(CashAdvanceStatus.APPROVED_ACCOUNTANT);
        return ApiResponse.success(list.stream().map(this::toDto).toList(), "pending-chief");
    }

    public ApiResponse<?> pendingForDirector() {
        var list = repo.findByStatusOrderByIdDesc(CashAdvanceStatus.APPROVED_CHIEF);
        return ApiResponse.success(list.stream().map(this::toDto).toList(), "pending-director");
    }

    /* ===================== Generate DOC ===================== */
    @Transactional(readOnly = true)
    public ResponseEntity<Resource> generateDoc(Long advanceId) throws IOException {
        CashAdvanceRequest r = repo.findById(advanceId)
                .orElseThrow(() -> new IllegalArgumentException("not-found"));

        ClassPathResource template = new ClassPathResource("templates/Advance_Payment.docx");
        try (InputStream is = template.getInputStream();
             XWPFDocument doc = new XWPFDocument(is)) {

            String number = r.getId() + "/" + r.getCreatedAt().getYear();
            String amountText = nvl(r.getAmountText(), "[amount in words]");

            // 🔹 Replace text placeholders
            replaceText(doc, "{{UNIT_NAME}}", "Next-Gen Enterprise Experience");
            replaceText(doc, "{{DEPARTMENT_OR_ADDRESS}}", "181 Cao Thang, Ward 12, District 10, HCM");
            replaceText(doc, "{{RECIPIENT}}",
                    "Board of Directors of Next-Gen Enterprise Experience Company");
            replaceText(doc, "{{REQUESTOR_NAME}}", safeName(r.getCreatedBy()));
            replaceText(doc, "{{REQUESTOR_TITLE}}", r.getCreatedBy().getRole().name());
            replaceText(doc, "{{AMOUNT}}", String.format("%,.0f VND", r.getAmount()));
            replaceTextStrict(doc, "{{AMOUNT_TEXT}}", amountText);
            replaceText(doc, "{{REASON}}", nvl(r.getReason(), ""));
            replaceText(doc, "{{DEADLINE}}", r.getCreatedAt().plusDays(7).toLocalDate().toString());
            replaceText(doc, "{{DAY}}", String.valueOf(r.getCreatedAt().getDayOfMonth()));
            replaceText(doc, "{{MONTH}}", String.valueOf(r.getCreatedAt().getMonthValue()));
            replaceText(doc, "{{YEAR}}", String.valueOf(r.getCreatedAt().getYear()));
            replaceTextStrict(doc, "{{NUMBER}}", number);

            // 🔹 Replace signature
            if (r.getSignatureDataUrl() != null && r.getSignatureDataUrl().startsWith("data:image")) {
                try {
                    String[] parts = r.getSignatureDataUrl().split(",");
                    if (parts.length == 2) {
                        byte[] imageBytes = Base64.getDecoder().decode(parts[1]);
                        if (imageBytes.length > 100) { 
                            for (XWPFParagraph p : doc.getParagraphs()) {
                                String fullText = p.getText();
                                if (fullText != null && fullText.contains("{{SIGNATURE}}")) {
                                    for (int i = p.getRuns().size() - 1; i >= 0; i--) {
                                        p.removeRun(i);
                                    }
                                    XWPFRun run = p.createRun();
                                    try (InputStream imgStream = new ByteArrayInputStream(imageBytes)) {
                                        run.addPicture(imgStream,
                                                XWPFDocument.PICTURE_TYPE_PNG,
                                                "signature.png",
                                                Units.toEMU(120),
                                                Units.toEMU(60));
                                    }
                                }
                            }
                        }
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }

            // 🔹 Xuất file
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            doc.write(baos);

            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .header("Content-Disposition", "attachment; filename=advance_" + r.getId() + ".docx")
                    .body(new org.springframework.core.io.ByteArrayResource(baos.toByteArray()));
        }
    }

    /* ===================== Helpers ===================== */
    private void replaceText(XWPFDocument doc, String placeholder, String value) {
        replaceInParagraphs(doc.getParagraphs(), placeholder, value);
        for (XWPFTable tbl : doc.getTables()) {
            for (XWPFTableRow row : tbl.getRows()) {
                for (XWPFTableCell cell : row.getTableCells()) {
                    replaceInParagraphs(cell.getParagraphs(), placeholder, value);
                }
            }
        }
    }

    private void replaceInParagraphs(List<XWPFParagraph> paragraphs, String placeholder, String value) {
        for (XWPFParagraph p : paragraphs) {
            for (XWPFRun run : p.getRuns()) {
                String text = run.getText(0);
                if (text != null && text.contains(placeholder)) {
                    text = text.replace(placeholder, value != null ? value : "");
                    run.setText(text, 0);
                }
            }
        }
    }

    private void replaceTextStrict(XWPFDocument doc, String placeholder, String value) {
        for (XWPFParagraph p : doc.getParagraphs()) {
            String fullText = p.getText();
            if (fullText.contains(placeholder)) {
                for (int i = p.getRuns().size() - 1; i >= 0; i--) {
                    p.removeRun(i);
                }
                p.createRun().setText(fullText.replace(placeholder, value));
            }
        }
        for (XWPFTable tbl : doc.getTables()) {
            for (XWPFTableRow row : tbl.getRows()) {
                for (XWPFTableCell cell : row.getTableCells()) {
                    replaceTextStrictInCell(cell, placeholder, value);
                }
            }
        }
    }

    private void replaceTextStrictInCell(XWPFTableCell cell, String placeholder, String value) {
        for (XWPFParagraph p : cell.getParagraphs()) {
            String fullText = p.getText();
            if (fullText.contains(placeholder)) {
                for (int i = p.getRuns().size() - 1; i >= 0; i--) {
                    p.removeRun(i);
                }
                p.createRun().setText(fullText.replace(placeholder, value));
            }
        }
    }

    private void replaceSignature(XWPFDocument doc, byte[] imageBytes) throws Exception {
        // paragraphs
        for (XWPFParagraph p : doc.getParagraphs()) {
            String text = p.getText();
            if (text != null && text.contains("{{SIGNATURE}}")) {
                for (int i = p.getRuns().size() - 1; i >= 0; i--) {
                    p.removeRun(i);
                }
                XWPFRun run = p.createRun();
                try (InputStream imgStream = new ByteArrayInputStream(imageBytes)) {
                    run.addPicture(imgStream,
                            Document.PICTURE_TYPE_PNG,
                            "signature.png",
                            Units.toEMU(120),
                            Units.toEMU(60));
                }
            }
        }
        // trong bảng
        for (XWPFTable tbl : doc.getTables()) {
            for (XWPFTableRow row : tbl.getRows()) {
                for (XWPFTableCell cell : row.getTableCells()) {
                    for (XWPFParagraph p : cell.getParagraphs()) {
                        String text = p.getText();
                        if (text != null && text.contains("{{SIGNATURE}}")) {
                            for (int i = p.getRuns().size() - 1; i >= 0; i--) {
                                p.removeRun(i);
                            }
                            XWPFRun run = p.createRun();
                            try (InputStream imgStream = new ByteArrayInputStream(imageBytes)) {
                                run.addPicture(imgStream,
                                        Document.PICTURE_TYPE_PNG,
                                        "signature.png",
                                        Units.toEMU(120),
                                        Units.toEMU(60));
                            }
                        }
                    }
                }
            }
        }
    }
}