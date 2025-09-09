package server.models.bank;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import server.models.Account;
import server.models.enums.bank.TopupStatus;


import java.time.LocalDateTime;

@Entity
@Table(name="topups", indexes = {
        @Index(name="idx_topup_code", columnList = "code")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Topup {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name="account_id")
    private Account account;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name="owner_id")
    private Account owner;

    private Long amount;

    @Column(nullable = false, unique = true)
    private String code;

    private String bankAccountNo;
    private String sepayRefId;

    @Enumerated(EnumType.STRING)
    private TopupStatus status;

    private LocalDateTime completedAt;

    @CreationTimestamp
    private LocalDateTime createdAt;
}