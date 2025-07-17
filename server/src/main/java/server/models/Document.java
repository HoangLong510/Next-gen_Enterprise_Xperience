package server.models;

import jakarta.persistence.*;
import lombok.*;
import server.models.enums.DocumentStatus;
import server.models.enums.DocumentType;

import java.time.LocalDateTime;

@Entity
@Table(name = "documents")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Document {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;

    private String content;

    private String fileUrl;

    @ManyToOne
    @JoinColumn(name = "created_by_id")
    private Account createdBy;

    @ManyToOne
    @JoinColumn(name = "receiver_id")
    private Account receiver;

//    @ManyToOne
//    @JoinColumn(name = "related_project_id", nullable = true)
//    private Project relatedProject;

    private LocalDateTime createdAt;

    @Enumerated(EnumType.STRING)
    private DocumentStatus status;

    @Enumerated(EnumType.STRING)
    private DocumentType type;

    @Column(columnDefinition = "TEXT")
    private String signature;
}
