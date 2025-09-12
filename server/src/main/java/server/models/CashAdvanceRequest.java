package server.models;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import server.models.enums.CashAdvanceStatus;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "cash_advance_requests",
        indexes = {
                @Index(name = "ix_cashadv_status", columnList = "status"),
                @Index(name = "ix_cashadv_sent_chief", columnList = "sentToChiefAt"),
                @Index(name = "ix_cashadv_sent_director", columnList = "sentToDirectorAt"),
                @Index(name = "ix_cashadv_chief_assignee", columnList = "chief_assignee_id"),
                @Index(name = "ix_cashadv_director_assignee", columnList = "director_assignee_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CashAdvanceRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "task_id",
            nullable = false,
            foreignKey = @ForeignKey(name = "fk_cashadv_task")
    )
    private Task task;

    @NotNull
    @Positive
    @Column(nullable = false)
    private Double amount;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Column(columnDefinition = "TEXT")
    private String recipient;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private CashAdvanceStatus status = CashAdvanceStatus.PENDING;

    @Column(name = "file_url", length = 1024)
    private String fileUrl;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "created_by_account_id",
            nullable = false,
            foreignKey = @ForeignKey(name = "fk_cashadv_created_by")
    )
    private Account createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "approved_by_account_id",
            foreignKey = @ForeignKey(name = "fk_cashadv_approved_by")
    )
    private Account approvedBy;

    @Column
    private LocalDateTime sentToChiefAt;

    @Column
    private LocalDateTime chiefApprovedAt;

    @Column
    private LocalDateTime sentToDirectorAt;

    @Column
    private LocalDateTime directorApprovedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "chief_assignee_id",
            foreignKey = @ForeignKey(name = "fk_cashadv_chief_assignee")
    )
    private Account chiefAssignee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "director_assignee_id",
            foreignKey = @ForeignKey(name = "fk_cashadv_director_assignee")
    )
    private Account directorAssignee;

    @Column(columnDefinition = "TEXT")
    private String rejectNote;

    @Column(name = "amount_text", columnDefinition = "TEXT")
    private String amountText;

    @Column(name = "signature_data_url", columnDefinition = "LONGTEXT")
    private String signatureDataUrl;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        if (status == null) status = CashAdvanceStatus.PENDING;
    }
}
