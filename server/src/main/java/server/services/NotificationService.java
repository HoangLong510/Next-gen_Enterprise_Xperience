package server.services;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import server.dtos.NotificationResponse;
import server.models.*;
import server.models.enums.*;
import server.repositories.*;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final AccountRepository accountRepository;
    private final DocumentRepository documentRepository;
    // TODO: enable khi có project
    // private final ProjectRepository projectRepository;
    // TODO: enable khi có task
    // private final TaskRepository taskRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final LeaveRequestRepository leaveRequestRepository;

    public NotificationResponse createNotification(NotificationType type, Long referenceId, boolean isResult) {

        Account recipient = null;
        Account sender = null;
        String title = "";
        String content = "";

        switch (type) {
            case DOCUMENT -> {
                Document doc = documentRepository.findById(referenceId)
                        .orElseThrow(() -> new IllegalArgumentException("Document not found"));
                if (isResult) {
                    // Nếu document đã ký nhưng chưa hoàn thành => gửi cho PM
                    if (doc.getStatus() == DocumentStatus.SIGNED) {
                        recipient = doc.getReceiver(); // PM nhận xử lý
                        sender = accountRepository.findByRole(Role.MANAGER)
                                .stream().findFirst().orElse(null);
                        title = "Công văn đã được ký";
                        content = "Công văn '" + doc.getTitle() + "' đã được giám đốc ký, bạn cần xử lý.";
                    }
                    // Nếu PM xử lý hoàn thành (ví dụ trạng thái COMPLETED)
                    else if (doc.getStatus() == DocumentStatus.COMPLETED) {
                        recipient = doc.getCreatedBy(); // Thư ký/người tạo nhận kết quả
                        sender = doc.getReceiver(); // PM là người gửi kết quả
                        title = "Kết quả xử lý công văn";
                        content = "Công văn '" + doc.getTitle() + "' đã được xử lý.";
                    }
                } else {
                    // Khi vừa tạo công văn PROJECT
                    if (doc.getType() == DocumentType.PROJECT) {
                        recipient = accountRepository.findByRole(Role.MANAGER)
                                .stream().findFirst().orElseThrow(() -> new IllegalArgumentException("Manager not found"));
                        sender = doc.getCreatedBy();
                        title = "Công văn dự án mới cần ký";
                        content = "Bạn có công văn dự án mới cần ký duyệt.";
                    } else {
                        recipient = doc.getReceiver();
                        if (recipient == null) throw new IllegalArgumentException("Document has no receiver assigned");
                        sender = doc.getCreatedBy();
                        title = "Công văn mới cần xử lý";
                        content = "Công văn: " + doc.getTitle();
                    }
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
                        action = "đã được duyệt";
                    } else if (leaveRequest.getStatus() == LeaveStatus.REJECTED) {
                        action = "đã bị từ chối";
                    } else if (leaveRequest.getStatus() == LeaveStatus.CANCELLED) {
                        action = "đã bị hủy";
                    } else { // PENDING hoặc các trạng thái khác
                        action = "đang chờ duyệt";
                    }
                    title = "Kết quả duyệt đơn nghỉ phép";
                    content = "Đơn nghỉ phép của bạn " + action + " bởi " +
                            sender.getEmployee().getFirstName() + " " + sender.getEmployee().getLastName();
                } else {
                    recipient = leaveRequest.getReceiver();
                    sender = leaveRequest.getSender();
                    title = "Đơn nghỉ phép mới cần duyệt";
                    content = "Đơn nghỉ phép của: " + sender.getEmployee().getFirstName() + " " + sender.getEmployee().getLastName();
                }
            }
            case ORDER -> {
                recipient = accountRepository.findByUsername("admin")
                        .orElseThrow(() -> new IllegalArgumentException("Admin account not found"));
                sender = null;
                if (isResult) {
                    title = "Kết quả xử lý đơn hàng";
                    content = "Đơn hàng của bạn đã được xử lý.";
                } else {
                    title = "Đơn hàng mới";
                    content = "Bạn có một đơn hàng mới cần xử lý";
                }
            }
            case GENERAL -> {
                recipient = accountRepository.findByUsername("admin")
                        .orElseThrow(() -> new IllegalArgumentException("Admin account not found"));
                sender = null;
                title = "Thông báo hệ thống";
                content = "Hệ thống có thông báo mới.";
            }
            // thêm các case khác nếu có
            default -> throw new IllegalArgumentException("Unsupported notification type");
        }

        if (recipient == null) {
            throw new IllegalStateException("Recipient must not be null");
        }

        return saveAndSendNotification(recipient, sender, title, content, type, referenceId);
    }

    public List<NotificationResponse> getByRecipient(String username) {
        var list = notificationRepository.findByRecipient_Username(username);
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
            }
        }
        return dto;
    }

    private NotificationResponse saveAndSendNotification(
            Account recipient,
            Account sender,
            String title,
            String content,
            NotificationType type,
            Long referenceId
    ) {
        Notification noti = Notification.builder()
                .title(title)
                .content(content)
                .recipient(recipient)
                .createdBy(sender)
                .read(false)
                .createdAt(LocalDateTime.now())
                .type(type)
                .referenceId(referenceId)
                .build();

        Notification saved = notificationRepository.save(noti);
        messagingTemplate.convertAndSend(
                "/topic/notifications/" + recipient.getUsername(),
                mapToResponse(saved)
        );
        return mapToResponse(saved);
    }
}
