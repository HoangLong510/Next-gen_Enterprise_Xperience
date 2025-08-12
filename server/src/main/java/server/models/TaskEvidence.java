// server/models/TaskEvidence.java
package server.models;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "task_evidences")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TaskEvidence {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id")
    private Task task;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by")
    private Account uploadedBy;

    @Column(nullable = false, length = 255)
    private String fileName;

    @Column(nullable = false, length = 500)
    private String fileUrl;      // <-- CHỈ LƯU URL

    @Column(length = 150)
    private String contentType;  // image/png, video/mp4, application/pdf…

    private Long size;
    private LocalDateTime uploadedAt;
}
