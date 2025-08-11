package server.models;

import jakarta.persistence.*;
import lombok.*;
import server.models.accountant.fund.Fund;
import server.models.enums.DocumentStatus;
import server.models.enums.DocumentType;
import server.models.enums.ProjectPriority;

import java.time.LocalDate;
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

    @Column(unique = true, nullable = false, length = 32)
    private String code;

    private String title;

    private String content;
    @Column(name = "code", length = 50, unique = true, nullable = false)
    private String code;
    private String fileUrl;

    @Column(name = "project_name")
    private String projectName;

    @Column(name = "project_description", columnDefinition = "TEXT")
    private String projectDescription;

    @Column(name = "project_deadline")
    private LocalDate projectDeadline;

    @Enumerated(EnumType.STRING)
    @Column(name = "project_priority")
    private ProjectPriority projectPriority;

    @ManyToOne
    @JoinColumn(name = "created_by_id")
    private Account createdBy;

    @ManyToOne
    @JoinColumn(name = "receiver_id")
    private Account receiver;

    @ManyToOne
    @JoinColumn(name = "pm_id")
    private Account pm;

    @ManyToOne
    @JoinColumn(name = "accountant_id")
    private Account accountant;

    @OneToOne(mappedBy = "document")
    private Project project;

    @OneToOne(mappedBy = "document")
    private Fund relatedFund;

    @Column(name = "fund_name")
    private String fundName;

    @Column(name = "fund_balance")
    private Double fundBalance;

    @Column(name = "fund_purpose", columnDefinition = "TEXT")
    private String fundPurpose;

    private LocalDateTime createdAt;

    @Enumerated(EnumType.STRING)
    private DocumentStatus status;

    @Enumerated(EnumType.STRING)
    private DocumentType type;

    @Column(columnDefinition = "TEXT")
    private String signature;
}
