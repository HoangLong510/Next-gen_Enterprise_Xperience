package server.models;

import jakarta.persistence.*;
import lombok.*;
import server.models.enums.DocumentHistoryAction;
import server.models.enums.DocumentStatus;
import server.models.enums.DocumentType;

import java.time.LocalDateTime;

@Entity
@Table(name = "document_histories")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DocumentHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Tài liệu gốc
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id", nullable = false)
    private Document document;

    // Ai tạo snapshot (MANAGER khi NOTE, SECRETARY khi UPDATE)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id", nullable = false)
    private Account createdBy;

    // Hành động
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DocumentHistoryAction action;

    // Version tăng dần theo từng lần ghi lịch sử
    @Column(nullable = false)
    private Integer version;

    // Snapshot nội dung
    private String title;

    @Column(columnDefinition = "TEXT")
    private String content;

    private String fileUrl;

    // PROJECT fields
    private String projectName;

    @Column(columnDefinition = "TEXT")
    private String projectDescription;

    private String projectPriority;   // lưu chuỗi cho đơn giản

    private String projectDeadline;   // yyyy-MM-dd

    // ADMINISTRATIVE fields
    private String fundName;

    private Double fundBalance;

    @Column(columnDefinition = "TEXT")
    private String fundPurpose;

    @Enumerated(EnumType.STRING)
    private DocumentType type;

    @Enumerated(EnumType.STRING)
    private DocumentStatus status;

    @Column(columnDefinition = "TEXT")
    private String signature;

    // Note tại thời điểm snapshot (nếu là NOTE)
    @Column(columnDefinition = "TEXT")
    private String managerNote;

    private LocalDateTime createdAt;
}
