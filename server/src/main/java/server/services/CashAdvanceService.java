package server.services;

import lombok.RequiredArgsConstructor;
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

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
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
    private final EmailService emailService;

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
        } catch (Exception ignore) {}
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
        d.setSignatureDataUrl(e.getSignatureDataUrl());
        d.setChiefSignatureDataUrl(e.getChiefSignatureDataUrl());
        d.setDirectorSignatureDataUrl(e.getDirectorSignatureDataUrl());
        d.setCreatedAt(e.getCreatedAt());
        d.setUpdatedAt(e.getUpdatedAt());
        return d;
    }

    /* ===================== Commands ===================== */
    @Transactional
    public ApiResponse<?> create(Account creator, CreateCashAdvanceDto payload, MultipartFile file) {
        if (payload.getAmount() == null || payload.getAmount() <= 0) {
            return ApiResponse.badRequest("invalid-params");
        }
        CashAdvanceRequest r = new CashAdvanceRequest();

        if (payload.getTaskId() != null) {
            Task task = taskRepo.findWithPhaseAndProjectById(payload.getTaskId()).orElse(null);
            if (task == null) return ApiResponse.notfound("task-not-found");
            r.setTask(task);
        }
        r.setAmount(payload.getAmount());
        r.setReason(payload.getReason());
        r.setStatus(CashAdvanceStatus.PENDING);
        r.setCreatedBy(creator);
        r.setCreatedAt(LocalDateTime.now());
        r.setUnitName(payload.getUnitName());
        r.setDepartmentOrAddress(payload.getDepartmentOrAddress());
        r.setRecipient(payload.getRecipient());
        r.setAmountText(payload.getAmountText());
        r.setRepaymentDeadlineStr(payload.getRepaymentDeadlineStr());
        r.setSignatureDataUrl(payload.getSignatureDataUrl());

        try {
            if (file != null && !file.isEmpty()) {
                String publicUrl = uploadFileService.storeFile("cash-advances", file);
                r.setFileUrl(publicUrl);
            }
        } catch (Exception ex) {
            return ApiResponse.badRequest("file-upload-failed");
        }

        repo.save(r);

        var accountants = accountRepo.findByRole(Role.ACCOUNTANT);
        if (accountants != null && !accountants.isEmpty()) {
            notificationService.notifyCashAdvanceCreated(r, creator, accountants);
        }

        try {
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
            ex.printStackTrace();
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
            repo.save(r);

            var chief = accountRepo.findByRole(Role.CHIEFACCOUNTANT).stream().findFirst().orElse(null);
            notificationService.notifyCashAdvanceApprovedByAccountant(r, actor, chief);
        } else {
            r.setStatus(CashAdvanceStatus.REJECTED);
            r.setApprovedBy(actor);
            r.setRejectNote(note);
            repo.save(r);

            notificationService.notifyCashAdvanceRejectedByAccountant(r, actor);
        }

        return ApiResponse.success(toDto(r), approve ? "accountant-approved" : "accountant-rejected");
    }

    @Transactional
    public ApiResponse<?> chiefApprove(Account actor, Long id, boolean approve, String note, String signatureDataUrl) {
        if (!isChief(actor)) return ApiResponse.badRequest("only-chief");
        var r = repo.findById(id).orElse(null);
        if (r == null) return ApiResponse.notfound("not-found");
        if (r.getStatus() != CashAdvanceStatus.APPROVED_ACCOUNTANT)
            return ApiResponse.badRequest("must-be-approved-by-accountant");

        if (approve) {
            r.setStatus(CashAdvanceStatus.APPROVED_CHIEF);
            r.setChiefApprovedAt(LocalDateTime.now());
            r.setChiefAssignee(actor);

            if (signatureDataUrl != null && signatureDataUrl.startsWith("data:image")) {
                r.setChiefSignatureDataUrl(signatureDataUrl);
            }

            repo.save(r);

            var director = accountRepo.findByRole(Role.MANAGER).stream().findFirst().orElse(null);
            notificationService.notifyCashAdvanceApprovedByChief(r, actor, director);

            return ApiResponse.success(toDto(r), "chief-approved");
        } else {
            r.setStatus(CashAdvanceStatus.REJECTED);
            r.setChiefAssignee(actor);
            r.setRejectNote(note);
            repo.save(r);

            var accountant = accountRepo.findByRole(Role.ACCOUNTANT).stream().findFirst().orElse(null);
            notificationService.notifyCashAdvanceRejectedByChief(r, actor, accountant);

            return ApiResponse.success(toDto(r), "chief-rejected");
        }
    }

    @Transactional
    public ApiResponse<?> directorApprove(Account actor, Long id, boolean approve, String note, String signatureDataUrl) {
        if (!isDirector(actor)) return ApiResponse.badRequest("only-director");
        var r = repo.findById(id).orElse(null);
        if (r == null) return ApiResponse.notfound("not-found");
        if (r.getStatus() != CashAdvanceStatus.APPROVED_CHIEF)
            return ApiResponse.badRequest("must-be-approved-by-chief");

        if (approve) {
            r.setStatus(CashAdvanceStatus.APPROVED_DIRECTOR);
            r.setDirectorApprovedAt(LocalDateTime.now());
            r.setDirectorAssignee(actor);

            if (signatureDataUrl != null && signatureDataUrl.startsWith("data:image")) {
                r.setDirectorSignatureDataUrl(signatureDataUrl);
            }

            repo.save(r);

            notificationService.notifyCashAdvanceApprovedByDirector(r, actor);

            try {
                ResponseEntity<Resource> docRes = generateDoc(r.getId());
                byte[] fileBytes = ((org.springframework.core.io.ByteArrayResource) docRes.getBody()).getByteArray();
                String fileName = "advance_" + r.getId() + ".docx";

                var emp = r.getCreatedBy().getEmployee();
                String email = (emp != null && emp.getEmail() != null) ? emp.getEmail() : null;
                if (email != null) {
                    String employeeName = safeName(r.getCreatedBy());
                    emailService.sendCashAdvanceApprovedEmail(
                            email,
                            employeeName,
                            fileBytes,
                            fileName
                    );
                }
            } catch (Exception e) {
                e.printStackTrace();
            }

            return ApiResponse.success(toDto(r), "director-approved");
        } else {
            r.setStatus(CashAdvanceStatus.REJECTED);
            r.setDirectorAssignee(actor);
            r.setRejectNote(note);
            repo.save(r);

            var accountant = accountRepo.findByRole(Role.ACCOUNTANT).stream().findFirst().orElse(null);
            var chief = accountRepo.findByRole(Role.CHIEFACCOUNTANT).stream().findFirst().orElse(null);
            notificationService.notifyCashAdvanceRejectedByDirector(r, actor, accountant, chief);

            return ApiResponse.success(toDto(r), "director-rejected");
        }
    }

    /* ===================== Queries ===================== */
    public ApiResponse<?> list(Account me, String statusStr, String scope) {
        Set<CashAdvanceStatus> statuses = null;
        if (statusStr != null && !statusStr.isBlank() && !"ALL".equalsIgnoreCase(statusStr)) {
            statuses = new LinkedHashSet<>();
            for (String s : statusStr.split(",")) {
                try {
                    statuses.add(CashAdvanceStatus.valueOf(s.trim().toUpperCase()));
                } catch (Exception ignore) {}
            }
            if (statuses.isEmpty()) statuses = null;
        }

        List<CashAdvanceRequest> list;
        if (isDirector(me) || isChief(me) || isAccountant(me)) {
            list = (statuses == null)
                    ? repo.findAllByOrderByIdDesc()
                    : repo.findByStatusInOrderByIdDesc(statuses);
        } else {
            list = (statuses == null)
                    ? repo.findByCreatedBy_IdOrderByIdDesc(me.getId())
                    : repo.findByCreatedBy_IdAndStatusInOrderByIdDesc(me.getId(), statuses);
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
            String deadlineStr = nvl(r.getRepaymentDeadlineStr(), "");

            // 🔹 Replace text placeholders
            replaceText(doc, "{{UNIT_NAME}}", "Công ty Cổ phần Trải nghiệm Doanh nghiệp Next-Gen");
            replaceText(doc, "{{DEPARTMENT_OR_ADDRESS}}", "181 Cao Thắng, Phường 12, Quận 10, TP.HCM");
            replaceText(doc, "{{RECIPIENT}}", "Ban Giám đốc Công ty Trải nghiệm Doanh nghiệp Next-Gen");
            replaceText(doc, "{{REQUESTOR_NAME}}", safeName(r.getCreatedBy()));
            replaceText(doc, "{{REQUESTOR_TITLE}}", r.getCreatedBy().getEmployee().getDepartment().getName());
            replaceText(doc, "{{AMOUNT}}", String.format("%,.0f VND", r.getAmount()));
            replaceTextStrict(doc, "{{AMOUNT_TEXT}}", amountText);
            replaceText(doc, "{{REASON}}", nvl(r.getReason(), ""));
            replaceText(doc, "{{DEADLINE}}", deadlineStr);
            replaceText(doc, "{{DAY}}", String.valueOf(r.getCreatedAt().getDayOfMonth()));
            replaceText(doc, "{{MONTH}}", String.valueOf(r.getCreatedAt().getMonthValue()));
            replaceText(doc, "{{YEAR}}", String.valueOf(r.getCreatedAt().getYear()));
            replaceTextStrict(doc, "{{NUMBER}}", number);

            // 🔹 Replace signatures
            for (XWPFParagraph p : doc.getParagraphs()) {
                try { replaceSignaturesInParagraph(p, r); } catch (Exception e) { e.printStackTrace(); }
            }

// Replace signatures - paragraphs trong bảng
            for (XWPFTable tbl : doc.getTables()) {
                for (XWPFTableRow row : tbl.getRows()) {
                    for (XWPFTableCell cell : row.getTableCells()) {
                        for (XWPFParagraph p : cell.getParagraphs()) {
                            try { replaceSignaturesInParagraph(p, r); } catch (Exception e) { e.printStackTrace(); }
                        }
                    }
                }
            }

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

    private static final String PH_EMP = "{{SIGN_EMPLOYEE}}";
    private static final String PH_CHF = "{{SIGN_CHIEF}}";
    private static final String PH_DIR = "{{SIGN_DIRECTOR}}";

    private void replaceSignaturesInParagraph(XWPFParagraph p, CashAdvanceRequest r) throws Exception {
        String full = p.getText();
        if (full == null) return;

        boolean hasAny = full.contains(PH_EMP) || full.contains(PH_CHF) || full.contains(PH_DIR);
        if (!hasAny) return;

        // Xóa sạch các run cũ để dựng lại từ đầu
        for (int i = p.getRuns().size() - 1; i >= 0; i--) p.removeRun(i);

        int pos = 0;
        while (pos < full.length()) {
            int iEmp = full.indexOf(PH_EMP, pos);
            int iChf = full.indexOf(PH_CHF, pos);
            int iDir = full.indexOf(PH_DIR, pos);

            // tìm placeholder gần nhất
            int next = Integer.MAX_VALUE;
            String hit = null;
            if (iEmp >= 0 && iEmp < next) { next = iEmp; hit = PH_EMP; }
            if (iChf >= 0 && iChf < next) { next = iChf; hit = PH_CHF; }
            if (iDir >= 0 && iDir < next) { next = iDir; hit = PH_DIR; }

            if (hit == null) {
                // không còn placeholder: đổ phần text còn lại
                if (pos < full.length()) {
                    XWPFRun run = p.createRun();
                    run.setText(full.substring(pos));
                }
                break;
            }

            // đổ phần text trước placeholder
            if (next > pos) {
                XWPFRun run = p.createRun();
                run.setText(full.substring(pos, next));
            }

            // chèn hình cho placeholder
            XWPFRun imgRun = p.createRun();
            if (PH_EMP.equals(hit)) {
                insertImageRun(imgRun, r.getSignatureDataUrl());
            } else if (PH_CHF.equals(hit)) {
                insertImageRun(imgRun, r.getChiefSignatureDataUrl());
            } else if (PH_DIR.equals(hit)) {
                insertImageRun(imgRun, r.getDirectorSignatureDataUrl());
            }

            pos = next + hit.length();
        }
    }


    private void insertImageRun(XWPFRun run, String dataUrl) throws Exception {
        if (dataUrl == null || !dataUrl.startsWith("data:image")) return;

        String[] parts = dataUrl.split(",", 2);
        if (parts.length != 2) return;

        byte[] imageBytes = Base64.getDecoder().decode(parts[1]);
        if (imageBytes.length < 100) return;

        BufferedImage img = ImageIO.read(new ByteArrayInputStream(imageBytes));
        if (img == null) return;

        int width = img.getWidth();
        int height = img.getHeight();
        int targetW = 120;
        int targetH = (int) (((double) height / width) * targetW);

        try (InputStream imgStream = new ByteArrayInputStream(imageBytes)) {
            run.addPicture(
                    imgStream,
                    XWPFDocument.PICTURE_TYPE_PNG,
                    "sig.png",
                    Units.toEMU(targetW),
                    Units.toEMU(targetH)
            );
        }
    }
}
