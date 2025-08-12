package server.services;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import server.dtos.NotificationResponse;
import server.models.*;
import server.models.enums.*;
import server.repositories.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final AccountRepository accountRepository;
    private final DocumentRepository documentRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final LeaveRequestRepository leaveRequestRepository;
    private final AttendanceRepository attendanceRepository;

    private void notifyMany(List<Account> recipients, Account sender, String title, String content, NotificationType type, Long referenceId) {
        for (Account acc : recipients) {
            saveAndSendNotification(acc, sender, title, content, type, referenceId);
        }
    }

    public NotificationResponse createNotification(NotificationType type, Long referenceId, boolean isResult) {

        Account recipient = null;
        Account sender = null;
        String title = "";
        String content = "";

        switch (type) {
            case PROJECT -> {
                Document doc = documentRepository.findById(referenceId).orElseThrow(() -> new IllegalArgumentException("Document not found"));

                Project project = doc.getProject();
                if (project == null) return null;

                if (!isResult) {
                    List<Account> recipients = List.of(doc.getCreatedBy(), doc.getReceiver());
                    sender = doc.getPm();
                    String kebabDocTitle = doc.getTitle() != null ? doc.getTitle().replaceAll("\\s+", "-") : "";
                    title = "new-project-created";
                    content = "the-document-'" + kebabDocTitle + "'-has-been-successfully-turned-into-a-project-by-the-pm";
                    notifyMany(recipients, sender, title, content, NotificationType.PROJECT, project.getId());
                }
                return null;
            }

            case DOCUMENT -> {
                Document doc = documentRepository.findById(referenceId).orElseThrow(() -> new IllegalArgumentException("Document not found"));

                String kebabDocTitle = doc.getTitle() != null ? doc.getTitle().replaceAll("\\s+", "-") : "";

                if (isResult && doc.getType() == DocumentType.ADMINISTRATIVE && doc.getStatus() == DocumentStatus.IN_PROGRESS) {
                    recipient = doc.getAccountant();
                    sender = doc.getReceiver();
                    title = "financial-document-signed";
                    content = "you-have-received-a-financial-document-signed-by-the-director-please-start-the-related-project-'" + kebabDocTitle + "'";
                } else if (isResult && doc.getStatus() == DocumentStatus.SIGNED) {
                    List<Account> recipients = List.of(doc.getCreatedBy(), doc.getPm());
                    sender = doc.getReceiver();
                    title = "document-signed";
                    content = "the-document-'" + kebabDocTitle + "'-has-been-signed-by-the-director-please-proceed-with-processing";
                    notifyMany(recipients, sender, title, content, NotificationType.DOCUMENT, doc.getId());
                    return null;
                } else if (isResult && doc.getStatus() == DocumentStatus.COMPLETED) {
                    recipient = doc.getCreatedBy();
                    sender = doc.getPm();
                    title = "document-processing-result";
                    content = "the-document-'" + kebabDocTitle + "'-has-been-processed";
                } else if (!isResult && doc.getType() == DocumentType.PROJECT) {
                    // Director
                    saveAndSendNotification(doc.getReceiver(), doc.getCreatedBy(), "new-project-document-requires-signature", "you-have-a-new-project-document-that-requires-your-signature", type, referenceId);
                    // PM
                    if (doc.getPm() != null) {
                        saveAndSendNotification(doc.getPm(), doc.getCreatedBy(), "assigned-as-project-manager", "you-have-been-assigned-as-project-manager-for-the-document-'" + kebabDocTitle + "'", type, referenceId);
                    }
                    return null;
                } else if (!isResult && doc.getType() == DocumentType.ADMINISTRATIVE) {
                    if (doc.getReceiver() == null)
                        throw new IllegalArgumentException("Document has no receiver assigned");
                    saveAndSendNotification(doc.getReceiver(), doc.getCreatedBy(), "new-financial-document-requires-signature", "you-have-a-new-financial-document-that-requires-your-signature", type, referenceId);

                    if (doc.getAccountant() == null)
                        throw new IllegalArgumentException("Document has no accountant assigned");
                    saveAndSendNotification(doc.getAccountant(), doc.getCreatedBy(), "new-financial-document-to-process", "you-have-been-assigned-to-process-the-financial-document-'" + kebabDocTitle + "'", type, referenceId);
                    return null;
                } else if (!isResult) {
                    recipient = doc.getReceiver();
                    if (recipient == null) throw new IllegalArgumentException("Document has no receiver assigned");
                    sender = doc.getCreatedBy();
                    title = "new-document-requires-processing";
                    content = "document-" + kebabDocTitle;
                }
            }
            case LEAVE_REQUEST -> {
                LeaveRequest leaveRequest = leaveRequestRepository.findById(referenceId).orElseThrow(() -> new IllegalArgumentException("Leave request not found"));

                if (isResult) {
                    recipient = leaveRequest.getSender();
                    sender = leaveRequest.getReceiver();
                    String action;
                    if (leaveRequest.getStatus() == LeaveStatus.APPROVED) {
                        action = "has-been-approved";
                    } else if (leaveRequest.getStatus() == LeaveStatus.REJECTED) {
                        action = "has-been-rejected";
                    } else if (leaveRequest.getStatus() == LeaveStatus.CANCELLED) {
                        action = "has-been-cancelled";
                    } else {
                        action = "is-pending-approval";
                    }
                    String approver = (sender != null) ? (sender.getEmployee() != null ? (sender.getEmployee().getFirstName() + "-" + sender.getEmployee().getLastName()).toLowerCase() : sender.getUsername().replaceAll("\\s+", "-")) : "unknown";
                    title = "leave-request-result";
                    content = "your-leave-request-" + action + "-by-" + approver;
                } else {
                    recipient = leaveRequest.getReceiver();
                    sender = leaveRequest.getSender();
                    String requester = (sender != null) ? (sender.getEmployee() != null ? (sender.getEmployee().getFirstName() + "-" + sender.getEmployee().getLastName()).toLowerCase() : sender.getUsername().replaceAll("\\s+", "-")) : "unknown";
                    title = "new-leave-request-for-approval";
                    content = "leave-request-from-" + requester;
                }
            }

            case ATTENDANCE -> {
                // Lấy bản ghi 1 lần
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
                        // Tháng trước
                        title = "reminder-missing-check-out-last-month";
                        content = "you-have-not-checked-out-for-" + checkInDate + "-from-last-month-please-update-before-salary-processing";
                    } else if (checkInDate.isEqual(yesterday)) {
                        // ✅ HÔM QUA (dành cho job 00:05)
                        title = "reminder-missing-check-out-yesterday";
                        content = "you-did-not-check-out-on-" + checkInDate + "-please-submit-justification-or-contact-hr";
                    } else if (checkInDate.isEqual(today)) {
                        // Hôm nay (nhắc lúc 17:00)
                        title = "reminder-missing-check-out-today";
                        content = "you-have-not-checked-out-for-" + checkInDate + "-please-update";
                    } else {
                        // Các ngày khác (fallback)
                        title = "reminder-missing-check-out";
                        content = "you-did-not-check-out-on-" + checkInDate + "-please-update";
                    }

                    saveAndSendNotification(recipient, sender, title, content, type, referenceId);
                    return null;
                } else {
                    // Kết quả duyệt giải trình
                    recipient = att.getAccount();
                    sender = findHRAccount();

                    String hrNote = att.getCheckOutHrNote() != null ? att.getCheckOutHrNote() : "";

                    if (att.getStatus() == AttendanceStatus.RESOLVED) {
                        title = "attendance-justification-approved";
                        content = "your-missing-check-out-justification-has-been-approved" + (hrNote.isBlank() ? "" : "-" + hrNote.replaceAll("\\s+", "-").toLowerCase());
                    } else if (att.getStatus() == AttendanceStatus.REJECTED) {
                        title = "attendance-justification-rejected";
                        content = "your-missing-check-out-justification-was-rejected" + (hrNote.isBlank() ? "" : "-" + hrNote.replaceAll("\\s+", "-").toLowerCase());
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

    public void notifyManagerNoteAdded(Document doc, Account manager) {
        String kebabDocTitle = doc.getTitle() != null ? doc.getTitle().replaceAll("\\s+", "-") : "";
        String kebabManager = getAccountDisplayName(manager).replaceAll("\\s+", "-").toLowerCase();

        // Gửi cho người tạo (thường là SECRETARY hoặc ADMIN)
        Account creator = doc.getCreatedBy();
        if (creator != null) {
            saveAndSendNotification(creator, manager, "manager-added-revision-note", "document-'" + kebabDocTitle + "'-has-a-new-manager-note-by-" + kebabManager, NotificationType.DOCUMENT, doc.getId());
        }
    }

    public void notifyPmReassignment(Document doc, Account oldPm, Account newPm, Account actor) {
        String kebabDocTitle = doc.getTitle() != null ? doc.getTitle().replaceAll("\\s+", "-") : "";
        String kebabActorName = getAccountDisplayName(actor).replaceAll("\\s+", "-").toLowerCase();

        if (oldPm != null && (newPm == null || !oldPm.getId().equals(newPm.getId()))) {
            saveAndSendNotification(oldPm, actor, "project-manager-changed", "you-are-no-longer-the-pm-for-document-'" + kebabDocTitle + "'", NotificationType.DOCUMENT, doc.getId());
        }
        if (newPm != null && (oldPm == null || !newPm.getId().equals(oldPm.getId()))) {
            saveAndSendNotification(newPm, actor, "assigned-as-project-manager", "you-are-now-the-pm-for-document-'" + kebabDocTitle + "'", NotificationType.DOCUMENT, doc.getId());
        }
        if (doc.getReceiver() != null) {
            saveAndSendNotification(doc.getReceiver(), actor, "document-revised", "document-'" + kebabDocTitle + "'-was-revised-by-" + kebabActorName + "-pm-changed", NotificationType.DOCUMENT, doc.getId());
        }
    }

    public void notifyDocumentRevised(Document doc, Account actor) {
        if (doc.getReceiver() == null) return;
        String kebabDocTitle = doc.getTitle() != null ? doc.getTitle().replaceAll("\\s+", "-") : "";
        String kebabActorName = getAccountDisplayName(actor).replaceAll("\\s+", "-").toLowerCase();

        saveAndSendNotification(doc.getReceiver(), actor, "document-revised", "document-'" + kebabDocTitle + "'-was-revised-by-" + kebabActorName, NotificationType.DOCUMENT, doc.getId());
    }


    public void notifyHROnNoteSubmission(Long attendanceId) {
        Attendance att = attendanceRepository.findById(attendanceId).orElseThrow(() -> new RuntimeException("Attendance record not found"));

        Account hr = findHRAccount();
        if (hr == null) return;

        Account employee = att.getAccount();
        String kebabEmp = (employee != null) ? (employee.getUsername() != null ? employee.getUsername().replaceAll("\\s+", "-").toLowerCase() : "unknown") : "unknown";

        String title = "employee-submitted-attendance-note";
        String content = "employee-" + kebabEmp + "-submitted-a-justification-note-for-" + att.getCheckInTime().toLocalDate() + "-please-review";

        saveAndSendNotification(hr, employee, title, content, NotificationType.ATTENDANCE, attendanceId);
    }

    private Account findHRAccount() {
        return accountRepository.findByRole(Role.HR).stream().findFirst().orElse(null);
    }

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
        dto.setContent(n.getContent());
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

    private NotificationResponse saveAndSendNotification(Account recipient, Account sender, String title, String content, NotificationType type, Long referenceId) {
        Notification noti = Notification.builder().title(title).content(content).recipient(recipient).createdBy(sender).read(false).createdAt(LocalDateTime.now()).type(type).referenceId(referenceId).build();

        Notification saved = notificationRepository.save(noti);
        messagingTemplate.convertAndSend("/topic/notifications/" + recipient.getUsername(), mapToResponse(saved));
        return mapToResponse(saved);
    }

    private String getAccountDisplayName(Account acc) {
        if (acc == null) return "Unknown";
        if (acc.getEmployee() != null) {
            return acc.getEmployee().getFirstName() + " " + acc.getEmployee().getLastName();
        }
        return acc.getUsername();
    }

    public void notifyProjectMembersAdded(Project project, List<Employee> added, Account sender) {
        if (project == null || added == null || added.isEmpty()) return;

        String kebabProject = (project.getName() != null && !project.getName().isBlank())
                ? project.getName().replaceAll("\\s+", "-").toLowerCase()
                : "project-" + project.getId();

        for (Employee emp : added) {
            Account acc = (emp != null) ? emp.getAccount() : null;
            if (acc == null) continue; // tránh lỗi Recipient null

            saveAndSendNotification(
                    acc,
                    sender, // thường là PM của project
                    "added-to-project",
                    "you-have-been-added-to-project-" + kebabProject,
                    NotificationType.PROJECT,
                    project.getId()
            );
        }

        // (tuỳ chọn) báo cho giám đốc/người tạo: đã thêm X người
        // var doc = project.getDocument();
        // if (doc != null && doc.getReceiver() != null) {
        //     saveAndSendNotification(doc.getReceiver(), sender, "project-members-updated",
        //             "pm-added-" + added.size() + "-members-to-" + kebabProject,
        //             NotificationType.PROJECT, project.getId());
        // }
    }

    public void notifyProjectMembersRemoved(Project project, List<Employee> removed, Account sender) {
        if (project == null || removed == null || removed.isEmpty()) return;

        String kebabProject = (project.getName() != null && !project.getName().isBlank())
                ? project.getName().replaceAll("\\s+", "-").toLowerCase()
                : "project-" + project.getId();

        for (Employee emp : removed) {
            Account acc = (emp != null) ? emp.getAccount() : null;
            if (acc == null) continue;

            saveAndSendNotification(
                    acc,
                    sender, // PM
                    "removed-from-project",
                    "you-have-been-removed-from-project-" + kebabProject,
                    NotificationType.PROJECT,
                    project.getId()
            );
        }

        // (tuỳ chọn) báo cho giám đốc/người tạo: đã gỡ X người
        // var doc = project.getDocument();
        // if (doc != null && doc.getReceiver() != null) {
        //     saveAndSendNotification(doc.getReceiver(), sender, "project-members-updated",
        //             "pm-removed-" + removed.size() + "-members-from-" + kebabProject,
        //             NotificationType.PROJECT, project.getId());
        // }
    }
}
