package server.dtos;

import lombok.Data;
import server.models.enums.NotificationType;

import java.time.LocalDateTime;

@Data
public class NotificationResponse {
    private Long id;
    private String title;
    private String content;
    private String recipient;  // username
    private boolean read;
    private LocalDateTime createdAt;
    private NotificationType type;
    private Long referenceId;
}
