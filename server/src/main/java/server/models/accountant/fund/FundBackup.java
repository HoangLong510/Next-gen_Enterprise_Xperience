package server.models.accountant.fund;

import jakarta.persistence.*;
import lombok.*;
import server.models.Account;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FundBackup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long originalFundId;

    private String name;

    private Double balance;

    private String purpose;

    private LocalDateTime backedUpAt;
    @ManyToOne
    @JoinColumn(name = "updated_by_id")
    private Account updatedByAccount;

}
