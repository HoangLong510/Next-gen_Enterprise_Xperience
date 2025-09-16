package server.services;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import server.dtos.NotificationResponse;
import server.models.*;
import server.models.enums.*;
import server.repositories.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final AccountRepository accountRepository;
    private final DocumentRepository documentRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final LeaveRequestRepository leaveRequestRepository;
    private final AttendanceRepository attendanceRepository;

    /* ===================== UTIL: BUILD JSON CONTENT ===================== */

    private String toJson(String key, Map<String, Object> params) {
        StringBuilder sb = new StringBuilder();
        sb.append("{\"key\":\"").append(jsonEscape(key)).append("\",\"params\":{");
        if (params != null && !params.isEmpty()) {
            boolean first = true;
            for (Map.Entry<String, Object> e : params.entrySet()) {
                if (!first) sb.append(",");
                first = false;
                sb.append("\"").append(jsonEscape(e.getKey())).append("\":");
                Object v = e.getValue();
                if (v == null) {
                    sb.append("null");
                } else if (v instanceof Number || v instanceof Boolean) {
                    sb.append(v.toString());
                } else {
                    sb.append("\"").append(jsonEscape(String.valueOf(v))).append("\"");
                }
            }
        }
        sb.append("}}");
        return sb.toString();
    }

    private String jsonEscape(String s) {
        if (s == null) return "";
        return s
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }

    private String getAccountDisplayName(Account acc) {
        if (acc == null) return "Unknown";
        if (acc.getEmployee() != null) {
            return acc.getEmployee().getFirstName() + " " + acc.getEmployee().getLastName();
        }
        return acc.getUsername();
    }

    private String safeProjectName(Project project) {
        if (project == null) return "project";
        if (project.getName() != null && !project.getName().isBlank()) return project.getName();
        return "project-" + project.getId();
    }

    /* ===================== CORE HELPERS ===================== */

    private void notifyMany(List<Account> recipients, Account sender, String title, String content, NotificationType type, Long referenceId) {
        for (Account acc : recipients) {
            saveAndSendNotification(acc, sender, title, content, type, referenceId);
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    protected NotificationResponse saveAndSendNotification(
            Account recipient,
            Account sender,
            String title,
            String content,
            NotificationType type,
            Long referenceId
    ) {
        Notification noti = Notification.builder()
                .title(title)
                .content(content) // JSON { key, params }
                .recipient(recipient)
                .createdBy(sender)
                .read(false)
                .createdAt(LocalDateTime.now())
                .type(type)
                .referenceId(referenceId)
                .build();

        Notification saved = notificationRepository.save(noti);

        try {
            messagingTemplate.convertAndSend(
                    "/topic/notifications/" + recipient.getUsername(),
                    mapToResponse(saved)
            );
        } catch (Exception ignore) {}

        return mapToResponse(saved);
    }

    /* ===================== PUBLIC APIs ===================== */

    public NotificationResponse createNotification(NotificationType type, Long referenceId, boolean isResult) {
        Account recipient = null;
        Account sender = null;
        String title = "";
        String content = "";

        switch (type) {
            case PROJECT -> {
                Document doc = documentRepository.findById(referenceId)
                        .orElseThrow(() -> new IllegalArgumentException("Document not found"));
                Project project = doc.getProject();
                if (project == null) return null;

                if (!isResult) {
                    List<Account> recipients = List.of(doc.getCreatedBy(), doc.getReceiver());
                    sender = doc.getPm();
                    String docTitle = doc.getTitle() != null ? doc.getTitle() : "";
                    title = "new-project-created";
                    content = toJson("project.created", Map.of("documentTitle", docTitle));
                    notifyMany(recipients, sender, title, content, NotificationType.PROJECT, project.getId());
                }
                return null;
            }

            case DOCUMENT -> {
                Document doc = documentRepository.findById(referenceId)
                        .orElseThrow(() -> new IllegalArgumentException("Document not found"));
                String docTitle = doc.getTitle() != null ? doc.getTitle() : "";

                if (isResult && doc.getType() == DocumentType.ADMINISTRATIVE && doc.getStatus() == DocumentStatus.IN_PROGRESS) {
                    recipient = doc.getAccountant();
                    sender = doc.getReceiver();
                    title = "financial-document-signed";
                    content = toJson("document.financial.signed", Map.of("documentTitle", docTitle));
                } else if (isResult && doc.getStatus() == DocumentStatus.SIGNED) {
                    List<Account> recipients = List.of(doc.getCreatedBy(), doc.getPm());
                    sender = doc.getReceiver();
                    title = "document-signed";
                    content = toJson("document.signed", Map.of("documentTitle", docTitle));
                    notifyMany(recipients, sender, title, content, NotificationType.DOCUMENT, doc.getId());
                    return null;
                } else if (isResult && doc.getStatus() == DocumentStatus.COMPLETED) {
                    recipient = doc.getCreatedBy();
                    sender = doc.getPm();
                    title = "document-processing-result";
                    content = toJson("document.processed", Map.of("documentTitle", docTitle));
                } else if (!isResult && doc.getType() == DocumentType.PROJECT) {
                    saveAndSendNotification(doc.getReceiver(), doc.getCreatedBy(),
                            "new-project-document-requires-signature",
                            toJson("document.project.requires-signature", Map.of()),
                            NotificationType.DOCUMENT, referenceId);
                    if (doc.getPm() != null) {
                        saveAndSendNotification(doc.getPm(), doc.getCreatedBy(),
                                "assigned-as-project-manager",
                                toJson("document.pm.assigned.for", Map.of("documentTitle", docTitle)),
                                NotificationType.DOCUMENT, referenceId);
                    }
                    return null;
                } else if (!isResult && doc.getType() == DocumentType.ADMINISTRATIVE) {
                    if (doc.getReceiver() == null) throw new IllegalArgumentException("Document has no receiver assigned");
                    saveAndSendNotification(doc.getReceiver(), doc.getCreatedBy(),
                            "new-financial-document-requires-signature",
                            toJson("document.financial.requires-signature", Map.of()),
                            NotificationType.DOCUMENT, referenceId);
                    if (doc.getAccountant() == null) throw new IllegalArgumentException("Document has no accountant assigned");
                    saveAndSendNotification(doc.getAccountant(), doc.getCreatedBy(),
                            "new-financial-document-to-process",
                            toJson("document.financial.to-process", Map.of("documentTitle", docTitle)),
                            NotificationType.DOCUMENT, referenceId);
                    return null;
                } else if (!isResult) {
                    recipient = doc.getReceiver();
                    if (recipient == null) throw new IllegalArgumentException("Document has no receiver assigned");
                    sender = doc.getCreatedBy();
                    title = "new-document-requires-processing";
                    content = toJson("document.requires-processing", Map.of("documentTitle", docTitle));
                }
            }

            case LEAVE_REQUEST -> {
                LeaveRequest leaveRequest = leaveRequestRepository.findById(referenceId)
                        .orElseThrow(() -> new IllegalArgumentException("Leave request not found"));
                if (isResult) {
                    recipient = leaveRequest.getSender();
                    sender = leaveRequest.getReceiver();
                    String action = switch (leaveRequest.getStatus()) {
                        case APPROVED -> "approved";
                        case REJECTED -> "rejected";
                        case CANCELLED -> "cancelled";
                        default -> "pending";
                    };
                    String approverName = (sender != null) ? getAccountDisplayName(sender) : "Unknown";
                    title = "leave-request-result";
                    content = toJson("leave.result", Map.of("action", action, "approver", approverName));
                } else {
                    recipient = leaveRequest.getReceiver();
                    sender = leaveRequest.getSender();
                    String requester = (sender != null) ? getAccountDisplayName(sender) : "Unknown";
                    title = "new-leave-request-for-approval";
                    content = toJson("leave.new", Map.of("requester", requester));
                }
            }

            case ATTENDANCE -> {
                Attendance att = attendanceRepository.findById(referenceId).orElse(null);
                if (att == null) return null;
                if (!isResult) {
                    LocalDate checkInDate = att.getCheckInTime() != null ? att.getCheckInTime().toLocalDate() : LocalDate.now();
                    LocalDate today = LocalDate.now();
                    LocalDate yesterday = today.minusDays(1);
                    LocalDate firstDayPrevMonth = today.minusMonths(1).withDayOfMonth(1);
                    LocalDate lastDayPrevMonth = today.minusMonths(1).withDayOfMonth(today.minusMonths(1).lengthOfMonth());
                    recipient = att.getAccount();
                    if (!checkInDate.isBefore(firstDayPrevMonth) && !checkInDate.isAfter(lastDayPrevMonth)) {
                        title = "reminder-missing-check-out-last-month";
                        content = toJson("attendance.missing.checkout.lastMonth", Map.of("date", checkInDate.toString()));
                    } else if (checkInDate.isEqual(yesterday)) {
                        title = "reminder-missing-check-out-yesterday";
                        content = toJson("attendance.missing.checkout.yesterday", Map.of("date", checkInDate.toString()));
                    } else if (checkInDate.isEqual(today)) {
                        title = "reminder-missing-check-out-today";
                        content = toJson("attendance.missing.checkout.today", Map.of("date", checkInDate.toString()));
                    } else {
                        title = "reminder-missing-check-out";
                        content = toJson("attendance.missing.checkout.generic", Map.of("date", checkInDate.toString()));
                    }
                    saveAndSendNotification(recipient, sender, title, content, type, referenceId);
                    return null;
                } else {
                    recipient = att.getAccount();
                    sender = findHRAccount();
                    String hrNote = att.getCheckOutHrNote() != null ? att.getCheckOutHrNote() : "";
                    if (att.getStatus() == AttendanceStatus.RESOLVED) {
                        title = "attendance-justification-approved";
                        content = toJson("attendance.justification.approved", Map.of("hrNote", hrNote));
                    } else if (att.getStatus() == AttendanceStatus.REJECTED) {
                        title = "attendance-justification-rejected";
                        content = toJson("attendance.justification.rejected", Map.of("hrNote", hrNote));
                    }
                }
            }

            default -> throw new IllegalArgumentException("Unsupported notification type");
        }

        if (recipient == null) throw new IllegalStateException("Recipient must not be null");
        return saveAndSendNotification(recipient, sender, title, content, type, referenceId);
    }

    /* ===================== DOCUMENT RELATED HELPERS ===================== */
    // (giữ nguyên như bạn gửi – đã OK)

    /* ===================== CASH ADVANCE NOTIFICATIONS ===================== */

    public void notifyCashAdvanceCreated(CashAdvanceRequest r, Account creator, List<Account> accountants) {
        if (r == null || creator == null || accountants == null || accountants.isEmpty()) return;
        String title = "new-cash-advance-request";
        String content = toJson("cash.advance.created", Map.of("id", r.getId(), "creator", getAccountDisplayName(creator)));
        notifyMany(accountants, creator, title, content, NotificationType.CASH_ADVANCE, r.getId());
    }

    public void notifyCashAdvanceApprovedByAccountant(CashAdvanceRequest r, Account accountant, Account chief) {
        if (r == null || chief == null) return;
        String title = "cash-advance-awaiting-chief-approval";
        String content = toJson("cash.advance.approved.by.accountant", Map.of("id", r.getId(), "approver", getAccountDisplayName(accountant)));
        saveAndSendNotification(chief, accountant, title, content, NotificationType.CASH_ADVANCE, r.getId());
    }

    public void notifyCashAdvanceRejectedByAccountant(CashAdvanceRequest r, Account accountant) {
        notifyCashAdvanceRejected(r, accountant);
    }

    public void notifyCashAdvanceApprovedByChief(CashAdvanceRequest r, Account chief, Account director) {
        if (r == null || director == null) return;
        String title = "cash-advance-awaiting-director-approval";
        String content = toJson("cash.advance.approved.by.chief", Map.of("id", r.getId(), "approver", getAccountDisplayName(chief)));
        saveAndSendNotification(director, chief, title, content, NotificationType.CASH_ADVANCE, r.getId());
    }

    public void notifyCashAdvanceRejectedByChief(CashAdvanceRequest r, Account chief, Account accountant) {
        notifyCashAdvanceRejected(r, chief);
        if (accountant != null) {
            String title = "cash-advance-rejected-by-chief";
            String content = toJson("cash.advance.rejected.by.chief", Map.of("id", r.getId(), "actor", getAccountDisplayName(chief), "note", r.getRejectNote() != null ? r.getRejectNote() : ""));
            saveAndSendNotification(accountant, chief, title, content, NotificationType.CASH_ADVANCE, r.getId());
        }
    }

    public void notifyCashAdvanceApprovedByDirector(CashAdvanceRequest r, Account director) {
        if (r == null || r.getCreatedBy() == null) return;
        Account requester = r.getCreatedBy();
        String title = "cash-advance-final-approved";
        String content = toJson("cash.advance.final.approved.by", Map.of("id", r.getId(), "approver", getAccountDisplayName(director)));
        saveAndSendNotification(requester, director, title, content, NotificationType.CASH_ADVANCE, r.getId());
    }

    public void notifyCashAdvanceRejectedByDirector(CashAdvanceRequest r, Account director, Account accountant, Account chief) {
        notifyCashAdvanceRejected(r, director);
        if (accountant != null) {
            String title = "cash-advance-rejected-by-director";
            String content = toJson("cash.advance.rejected.by.director", Map.of("id", r.getId(), "actor", getAccountDisplayName(director), "note", r.getRejectNote() != null ? r.getRejectNote() : ""));
            saveAndSendNotification(accountant, director, title, content, NotificationType.CASH_ADVANCE, r.getId());
        }
        if (chief != null) {
            String title = "cash-advance-rejected-by-director";
            String content = toJson("cash.advance.rejected.by.director", Map.of("id", r.getId(), "actor", getAccountDisplayName(director), "note", r.getRejectNote() != null ? r.getRejectNote() : ""));
            saveAndSendNotification(chief, director, title, content, NotificationType.CASH_ADVANCE, r.getId());
        }
    }

    public void notifyCashAdvanceRejected(CashAdvanceRequest r, Account actor) {
        if (r == null || r.getCreatedBy() == null) return;
        Account requester = r.getCreatedBy();
        String note = (r.getRejectNote() == null || r.getRejectNote().isBlank()) ? "" : r.getRejectNote();
        String title = "cash-advance-rejected";
        String content = toJson("cash.advance.rejected.by", Map.of("id", r.getId(), "actor", getAccountDisplayName(actor), "note", note));
        saveAndSendNotification(requester, actor, title, content, NotificationType.CASH_ADVANCE, r.getId());
    }

    /* ===================== TASK NOTIFICATIONS ===================== */
    // (giữ nguyên như bạn gửi – đã OK)
}
