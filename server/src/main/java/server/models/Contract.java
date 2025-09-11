package server.models;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import server.models.enums.ContractType;
import server.models.enums.ContractStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "contracts",
        indexes = {
                @Index(name = "idx_contract_code", columnList = "contractCode", unique = true),
                @Index(name = "idx_contract_employee", columnList = "employee_id")
        })
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Contract {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String contractCode;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(nullable = false)
    private LocalDate startDate;

    @Column(nullable = false)
    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ContractType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private ContractStatus status;

    @Column(columnDefinition = "TEXT")
    private String note;

    // === Chữ ký điện tử (base64) ===
    @Column(columnDefinition = "TEXT")
    private String managerSignature;

    @Column(columnDefinition = "TEXT")
    private String employeeSignature;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal basicSalary;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @PrePersist
    private void prePersist() {
        if (status == null) status = ContractStatus.PENDING;
    }
}
