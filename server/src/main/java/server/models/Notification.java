package server.models;

import jakarta.persistence.*;
import lombok.*;
import server.models.enums.NotificationType;

import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;

    private String content;

    @ManyToOne
    @JoinColumn(name = "recipient_id")
    private Account recipient;

    @Column(name = "`read`")
    private boolean read;

    private LocalDateTime createdAt;

    @Enumerated(EnumType.STRING)
    private NotificationType type;

    private Long referenceId; // với GENERAL hoặc ORDER có thể null nếu không liên kết
}

