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
                .content(content) // <-- JSON { key, params }
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
                    content = toJson("project.created", Map.of(
                            "documentTitle", docTitle
                    ));
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
                    content = toJson("document.financial.signed", Map.of(
                            "documentTitle", docTitle
                    ));
                } else if (isResult && doc.getStatus() == DocumentStatus.SIGNED) {
                    List<Account> recipients = List.of(doc.getCreatedBy(), doc.getPm());
                    sender = doc.getReceiver();
                    title = "document-signed";
                    content = toJson("document.signed", Map.of(
                            "documentTitle", docTitle
                    ));
                    notifyMany(recipients, sender, title, content, NotificationType.DOCUMENT, doc.getId());
                    return null;
                } else if (isResult && doc.getStatus() == DocumentStatus.COMPLETED) {
                    recipient = doc.getCreatedBy();
                    sender = doc.getPm();
                    title = "document-processing-result";
                    content = toJson("document.processed", Map.of(
                            "documentTitle", docTitle
                    ));
                } else if (!isResult && doc.getType() == DocumentType.PROJECT) {
                    // Director
                    saveAndSendNotification(
                            doc.getReceiver(),
                            doc.getCreatedBy(),
                            "new-project-document-requires-signature",
                            toJson("document.project.requires-signature", Map.of()),
                            NotificationType.DOCUMENT,
                            referenceId
                    );
                    // PM
                    if (doc.getPm() != null) {
                        saveAndSendNotification(
                                doc.getPm(),
                                doc.getCreatedBy(),
                                "assigned-as-project-manager",
                                toJson("document.pm.assigned.for", Map.of(
                                        "documentTitle", docTitle
                                )),
                                NotificationType.DOCUMENT,
                                referenceId
                        );
                    }
                    return null;
                } else if (!isResult && doc.getType() == DocumentType.ADMINISTRATIVE) {
                    if (doc.getReceiver() == null)
                        throw new IllegalArgumentException("Document has no receiver assigned");

                    saveAndSendNotification(
                            doc.getReceiver(),
                            doc.getCreatedBy(),
                            "new-financial-document-requires-signature",
                            toJson("document.financial.requires-signature", Map.of()),
                            NotificationType.DOCUMENT,
                            referenceId
                    );

                    if (doc.getAccountant() == null)
                        throw new IllegalArgumentException("Document has no accountant assigned");

                    saveAndSendNotification(
                            doc.getAccountant(),
                            doc.getCreatedBy(),
                            "new-financial-document-to-process",
                            toJson("document.financial.to-process", Map.of(
                                    "documentTitle", docTitle
                            )),
                            NotificationType.DOCUMENT,
                            referenceId
                    );
                    return null;
                } else if (!isResult) {
                    recipient = doc.getReceiver();
                    if (recipient == null) throw new IllegalArgumentException("Document has no receiver assigned");
                    sender = doc.getCreatedBy();
                    title = "new-document-requires-processing";
                    content = toJson("document.requires-processing", Map.of(
                            "documentTitle", docTitle
                    ));
                }
            }
            case LEAVE_REQUEST -> {
                LeaveRequest leaveRequest = leaveRequestRepository.findById(referenceId)
                        .orElseThrow(() -> new IllegalArgumentException("Leave request not found"));

                if (isResult) {
                    recipient = leaveRequest.getSender();
                    sender = leaveRequest.getReceiver();

                    String action;
                    if (leaveRequest.getStatus() == LeaveStatus.APPROVED) {
                        action = "approved";
                    } else if (leaveRequest.getStatus() == LeaveStatus.REJECTED) {
                        action = "rejected";
                    } else if (leaveRequest.getStatus() == LeaveStatus.CANCELLED) {
                        action = "cancelled";
                    } else {
                        action = "pending";
                    }

                    String approverName = (sender != null) ? getAccountDisplayName(sender) : "Unknown";

                    title = "leave-request-result";
                    content = toJson("leave.result", Map.of(
                            "action", action,
                            "approver", approverName
                    ));
                } else {
                    recipient = leaveRequest.getReceiver();
                    sender = leaveRequest.getSender();
                    String requester = (sender != null) ? getAccountDisplayName(sender) : "Unknown";
                    title = "new-leave-request-for-approval";
                    content = toJson("leave.new", Map.of(
                            "requester", requester
                    ));
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
                        content = toJson("attendance.missing.checkout.lastMonth", Map.of(
                                "date", checkInDate.toString()
                        ));
                    } else if (checkInDate.isEqual(yesterday)) {
                        title = "reminder-missing-check-out-yesterday";
                        content = toJson("attendance.missing.checkout.yesterday", Map.of(
                                "date", checkInDate.toString()
                        ));
                    } else if (checkInDate.isEqual(today)) {
                        title = "reminder-missing-check-out-today";
                        content = toJson("attendance.missing.checkout.today", Map.of(
                                "date", checkInDate.toString()
                        ));
                    } else {
                        title = "reminder-missing-check-out";
                        content = toJson("attendance.missing.checkout.generic", Map.of(
                                "date", checkInDate.toString()
                        ));
                    }

                    saveAndSendNotification(recipient, sender, title, content, type, referenceId);
                    return null;
                } else {
                    recipient = att.getAccount();
                    sender = findHRAccount();

                    String hrNote = att.getCheckOutHrNote() != null ? att.getCheckOutHrNote() : "";

                    if (att.getStatus() == AttendanceStatus.RESOLVED) {
                        title = "attendance-justification-approved";
                        content = toJson("attendance.justification.approved", Map.of(
                                "hrNote", hrNote
                        ));
                    } else if (att.getStatus() == AttendanceStatus.REJECTED) {
                        title = "attendance-justification-rejected";
                        content = toJson("attendance.justification.rejected", Map.of(
                                "hrNote", hrNote
                        ));
                    }
                }
            }
            default -> throw new IllegalArgumentException("Unsupported notification type");
        }

        if (recipient == null) {
            throw new IllegalStateException("Recipient must not be null");
        }

        return saveAndSendNotification(recipient, sender, title, content, type, referenceId);
    }

    /* ===================== DOCUMENT RELATED HELPERS ===================== */

    public void notifyManagerNoteAdded(Document doc, Account manager) {
        String docTitle = doc.getTitle() != null ? doc.getTitle() : "";
        String managerName = getAccountDisplayName(manager);

        Account creator = doc.getCreatedBy();
        if (creator != null) {
            saveAndSendNotification(
                    creator,
                    manager,
                    "manager-added-revision-note",
                    toJson("document.manager.note.added", Map.of(
                            "documentTitle", docTitle,
                            "managerName", managerName
                    )),
                    NotificationType.DOCUMENT,
                    doc.getId()
            );
        }
    }

    public void notifyPmReassignment(Document doc, Account oldPm, Account newPm, Account actor) {
        String docTitle = doc.getTitle() != null ? doc.getTitle() : "";
        String actorName = getAccountDisplayName(actor);

        if (oldPm != null && (newPm == null || !oldPm.getId().equals(newPm.getId()))) {
            saveAndSendNotification(
                    oldPm,
                    actor,
                    "project-manager-changed",
                    toJson("document.pm.changed.you-are-no-longer", Map.of(
                            "documentTitle", docTitle
                    )),
                    NotificationType.DOCUMENT,
                    doc.getId()
            );
        }
        if (newPm != null && (oldPm == null || !newPm.getId().equals(oldPm.getId()))) {
            saveAndSendNotification(
                    newPm,
                    actor,
                    "assigned-as-project-manager",
                    toJson("document.pm.assigned.for", Map.of(
                            "documentTitle", docTitle
                    )),
                    NotificationType.DOCUMENT,
                    doc.getId()
            );
        }
        if (doc.getReceiver() != null) {
            saveAndSendNotification(
                    doc.getReceiver(),
                    actor,
                    "document-revised",
                    toJson("document.revised.pm-changed", Map.of(
                            "documentTitle", docTitle,
                            "actorName", actorName
                    )),
                    NotificationType.DOCUMENT,
                    doc.getId()
            );
        }
    }

    public void notifyDocumentRevised(Document doc, Account actor) {
        if (doc.getReceiver() == null) return;
        String docTitle = doc.getTitle() != null ? doc.getTitle() : "";
        String actorName = getAccountDisplayName(actor);

        saveAndSendNotification(
                doc.getReceiver(),
                actor,
                "document-revised",
                toJson("document.revised", Map.of(
                        "documentTitle", docTitle,
                        "actorName", actorName
                )),
                NotificationType.DOCUMENT,
                doc.getId()
        );
    }

    /* ===================== ATTENDANCE HELPERS ===================== */

    public void notifyHROnNoteSubmission(Long attendanceId) {
        Attendance att = attendanceRepository.findById(attendanceId)
                .orElseThrow(() -> new RuntimeException("Attendance record not found"));

        Account hr = findHRAccount();
        if (hr == null) return;

        Account employee = att.getAccount();
        String empName = (employee != null) ? (employee.getUsername() != null ? employee.getUsername() : "Unknown") : "Unknown";

        String title = "employee-submitted-attendance-note";
        String content = toJson("attendance.note.submitted", Map.of(
                "employee", empName,
                "date", att.getCheckInTime().toLocalDate().toString()
        ));

        saveAndSendNotification(hr, employee, title, content, NotificationType.ATTENDANCE, attendanceId);
    }

    private Account findHRAccount() {
        return accountRepository.findByRole(Role.HR).stream().findFirst().orElse(null);
    }

    /* ===================== QUERY & STATE ===================== */

    public List<NotificationResponse> getByRecipient(String username) {
        var list = notificationRepository.findByRecipientUsernameWithJoinFetch(username);
        return list.stream().map(this::mapToResponse).toList();
    }

    public void markAsRead(Long id) {
        notificationRepository.findById(id).ifPresent(n -> {
            n.setRead(true);
            notificationRepository.save(n);
        });
    }

    private NotificationResponse mapToResponse(Notification n) {
        var dto = new NotificationResponse();
        dto.setId(n.getId());
        dto.setTitle(n.getTitle());
        dto.setContent(n.getContent()); // JSON string
        dto.setRecipient(n.getRecipient().getUsername());
        dto.setRead(n.isRead());
        dto.setCreatedAt(n.getCreatedAt());
        dto.setType(n.getType());
        dto.setReferenceId(n.getReferenceId());

        if (n.getCreatedBy() != null) {
            dto.setSenderUsername(n.getCreatedBy().getUsername());
            if (n.getCreatedBy().getEmployee() != null) {
                var emp = n.getCreatedBy().getEmployee();
                dto.setSenderFullName(emp.getFirstName() + " " + emp.getLastName());
                dto.setSenderAvatar(emp.getAvatar());
            } else {
                dto.setSenderFullName(n.getCreatedBy().getUsername());
            }
        } else {
            dto.setSenderUsername("System");
            dto.setSenderFullName("System");
            dto.setSenderAvatar(null);
        }

        return dto;
    }

    /* ===================== CASH ADVANCE NOTIFICATIONS ===================== */

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void notifyCashAdvanceSentToChief(Account chief, int count) {
        if (chief == null || count <= 0) return;
        String title = "cash-advance-awaiting-chief-review";
        String content = toJson("cash.advance.awaiting.chief", Map.of(
                "count", count
        ));
        saveAndSendNotification(chief, null, title, content, NotificationType.CASH_ADVANCE, null);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void notifyCashAdvanceSentToDirector(Account director, int count) {
        if (director == null || count <= 0) return;
        String title = "cash-advance-awaiting-final-approval";
        String content = toJson("cash.advance.awaiting.director", Map.of(
                "count", count
        ));
        saveAndSendNotification(director, null, title, content, NotificationType.CASH_ADVANCE, null);
    }

    public void notifyCashAdvanceChiefApproved(CashAdvanceRequest r, Account chief) {
        if (r == null || r.getCreatedBy() == null) return;
        Account requester = r.getCreatedBy();
        String title = "cash-advance-approved-by-chief";
        String content = toJson("cash.advance.approved.by", Map.of(
                "id", r.getId(),
                "approver", getAccountDisplayName(chief)
        ));
        saveAndSendNotification(requester, chief, title, content, NotificationType.CASH_ADVANCE, r.getId());
    }

    public void notifyCashAdvanceDirectorApproved(CashAdvanceRequest r, Account director) {
        if (r == null || r.getCreatedBy() == null) return;
        Account requester = r.getCreatedBy();
        String title = "cash-advance-final-approved";
        String content = toJson("cash.advance.final.approved.by", Map.of(
                "id", r.getId(),
                "approver", getAccountDisplayName(director)
        ));
        saveAndSendNotification(requester, director, title, content, NotificationType.CASH_ADVANCE, r.getId());
    }

    public void notifyCashAdvanceRejected(CashAdvanceRequest r, Account actor) {
        if (r == null || r.getCreatedBy() == null) return;
        Account requester = r.getCreatedBy();
        String note = (r.getRejectNote() == null || r.getRejectNote().isBlank()) ? "" : r.getRejectNote();
        String title = "cash-advance-rejected";
        String content = toJson("cash.advance.rejected.by", Map.of(
                "id", r.getId(),
                "actor", getAccountDisplayName(actor),
                "note", note
        ));
        saveAndSendNotification(requester, actor, title, content, NotificationType.CASH_ADVANCE, r.getId());
    }

    // tiện dùng
    public void notifyUser(Long recipientAccountId, String title, String content, NotificationType type, Long referenceId) {
        if (recipientAccountId == null) return;
        accountRepository.findById(recipientAccountId).ifPresent(acc ->
                saveAndSendNotification(acc, null, title, content, type, referenceId)
        );
    }

    public void notifyProjectMembersAdded(Project project, List<Employee> added, Account sender) {
        if (project == null || added == null || added.isEmpty()) return;

        String projectName = safeProjectName(project);

        for (Employee emp : added) {
            Account acc = (emp != null) ? emp.getAccount() : null;
            if (acc == null) continue;

            saveAndSendNotification(
                    acc,
                    sender,
                    "added-to-project",
                    toJson("project.member.added", Map.of(
                            "projectName", projectName
                    )),
                    NotificationType.PROJECT,
                    project.getId()
            );
        }
    }

    public void notifyProjectMembersRemoved(Project project, List<Employee> removed, Account sender) {
        if (project == null || removed == null || removed.isEmpty()) return;

        String projectName = safeProjectName(project);

        for (Employee emp : removed) {
            Account acc = (emp != null) ? emp.getAccount() : null;
            if (acc == null) continue;

            saveAndSendNotification(
                    acc,
                    sender,
                    "removed-from-project",
                    toJson("project.member.removed", Map.of(
                            "projectName", projectName
                    )),
                    NotificationType.PROJECT,
                    project.getId()
            );
        }
    }

    /* ===================== TASK NOTIFICATIONS ===================== */

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void notifyTaskAssigned(Task task, Account sender) {
        if (task == null || task.getAssignee() == null) return;

        Employee emp = task.getAssignee();
        if (emp.getAccount() == null) return;

        Account recipient = emp.getAccount();

        String taskName = (task.getName() != null && !task.getName().isBlank()) ? task.getName() : "task-" + task.getId();

        saveAndSendNotification(
                recipient,
                sender,
                "assigned-to-task",
                toJson("task.assigned", Map.of(
                        "taskName", taskName,
                        "projectId", task.getPhase().getProject().getId(),
                        "phaseId", task.getPhase().getId()
                )),
                NotificationType.TASK,
                task.getId()
        );
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void notifyAssigneeOnTaskUpdate(Task task, Account actor) {
        if (task == null || task.getAssignee() == null) return;
        Account recipient = task.getAssignee().getAccount();
        if (recipient == null) return;

        String taskName = (task.getName() != null && !task.getName().isBlank())
                ? task.getName() : "task-" + task.getId();
        String status = task.getStatus() != null ? task.getStatus().name() : "UNKNOWN";

        Long projectId = (task.getPhase() != null && task.getPhase().getProject() != null)
                ? task.getPhase().getProject().getId() : null;
        Long phaseId = (task.getPhase() != null) ? task.getPhase().getId() : null;

        // Tránh tự báo cho chính actor nếu actor là assignee
        if (actor != null && recipient.getId().equals(actor.getId())) return;

        saveAndSendNotification(
                recipient,
                actor,
                "task-updated",
                toJson("task.updated", Map.of(
                        "taskName", taskName,
                        "status", status,
                        "projectId", projectId,
                        "phaseId", phaseId
                )),
                NotificationType.TASK,
                task.getId()
        );
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void  notifyPmOnTaskUpdate(Task task, Account actor) {
        if (task == null || task.getPhase() == null || task.getPhase().getProject() == null) return;

        Project project = task.getPhase().getProject();
        Account pm = project.getProjectManager(); // PM là Account
        if (pm == null) return;

        String taskName = (task.getName() != null && !task.getName().isBlank()) ? task.getName() : "task-" + task.getId();
        String status = task.getStatus() != null ? task.getStatus().name() : "UNKNOWN";

        saveAndSendNotification(
                pm,
                actor,
                "task-updated",
                toJson("task.updated", Map.of(
                        "taskName", taskName,
                        "status", status,
                        "projectId", task.getPhase().getProject().getId(),
                        "phaseId", task.getPhase().getId()
                )),
                NotificationType.TASK,
                task.getId()
        );
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void notifyProjectCompleted(Project project, Document doc, Account actor) {
        if (project == null || doc == null) return;

        String content = toJson("project.completed", Map.of(
                "projectName", safeProjectName(project),
                "documentTitle", doc.getTitle() != null ? doc.getTitle() : ""
        ));

        // Manager
        Account manager = accountRepository.findByRole(Role.MANAGER)
                .stream()
                .findFirst()
                .orElse(null);

        // Secretary (người tạo document)
        Account secretary = doc.getCreatedBy();

        if (manager != null) {
            saveAndSendNotification(
                    manager,
                    actor,
                    "project-completed",
                    content,
                    NotificationType.PROJECT,
                    project.getId()
            );
        }

        if (secretary != null) {
            saveAndSendNotification(
                    secretary,
                    actor,
                    "project-completed",
                    content,
                    NotificationType.PROJECT,
                    project.getId()
            );
        }
    }
}
