package server.services;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import server.dtos.NotificationResponse;
import server.models.*;
import server.models.enums.NotificationType;
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

    public NotificationResponse createNotification(NotificationType type, Long referenceId) {

        Account recipient;
        String title;
        String content;

        switch (type) {
            case DOCUMENT -> {
                Document doc = documentRepository.findById(referenceId)
                        .orElseThrow(() -> new IllegalArgumentException("Document not found"));
                recipient = doc.getProjectManager();
                if (recipient == null) {
                    throw new IllegalArgumentException("Document has no project manager assigned");
                }
                title = "Công văn mới cần xử lý";
                content = "Công văn: " + doc.getTitle();
            }
            // TODO: chỉ mở khi có project
            /*
            case PROJECT -> {
                Project pj = projectRepository.findById(referenceId)
                        .orElseThrow(() -> new IllegalArgumentException("Project not found"));
                recipient = pj.getManager();
                title = "Dự án mới được giao";
                content = "Dự án: " + pj.getName();
            }
            */
            // TODO: chỉ mở khi có task
            /*
            case TASK -> {
                Task task = taskRepository.findById(referenceId)
                        .orElseThrow(() -> new IllegalArgumentException("Task not found"));
                recipient = task.getAssignee();
                title = "Bạn có một nhiệm vụ mới";
                content = "Nhiệm vụ: " + task.getTitle();
            }
            */
            case ORDER -> {
                recipient = accountRepository.findByUsername("admin")
                        .orElseThrow(() -> new IllegalArgumentException("Admin account not found"));
                title = "Đơn hàng mới";
                content = "Bạn có một đơn hàng mới cần xử lý";
            }
            case GENERAL -> {
                recipient = accountRepository.findByUsername("admin")
                        .orElseThrow(() -> new IllegalArgumentException("Admin account not found"));
                title = "Thông báo hệ thống";
                content = "Hệ thống có thông báo mới.";
            }
            default -> throw new IllegalArgumentException("Unsupported notification type");
        }

        Notification noti = Notification.builder()
                .title(title)
                .content(content)
                .recipient(recipient)
                .read(false)
                .createdAt(LocalDateTime.now())
                .type(type)
                .referenceId(referenceId)
                .build();

        var saved = notificationRepository.save(noti);

        messagingTemplate.convertAndSend(
                "/topic/notifications/" + recipient.getUsername(),
                mapToResponse(saved)
        );

        return mapToResponse(saved);
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
        return dto;
    }
}
