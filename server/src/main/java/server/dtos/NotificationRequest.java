package server.dtos;

import lombok.Data;
import server.models.enums.NotificationType;

@Data
public class NotificationRequest {
    private NotificationType type;
    private Long referenceId;
}
