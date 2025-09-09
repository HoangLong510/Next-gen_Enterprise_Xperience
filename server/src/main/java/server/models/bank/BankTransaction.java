package server.models.bank;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import server.models.enums.bank.BankTxType;


import java.time.LocalDateTime;

@Entity @Table(name = "bank_transactions", indexes = {
        @Index(name = "ux_bank_tx_refid", columnList = "ref_id", unique = true),
        @Index(name = "ix_bank_tx_txtime_desc", columnList = "tx_time")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BankTransaction {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String refId;

    private String accountNo;

    private String counterAccountNo;
    private String counterName;

    @Enumerated(EnumType.STRING)
    private BankTxType type;

    private Long amount;
    private Long balance;
    private String description;
    private LocalDateTime txTime;

    @Lob
    private String raw;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
