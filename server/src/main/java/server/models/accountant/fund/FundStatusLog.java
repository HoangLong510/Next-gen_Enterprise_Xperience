package server.models.accountant.fund;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import server.models.Account;

import java.time.LocalDateTime;

@Entity
@Table(name = "fund_status_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class FundStatusLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fund_id")
    private Fund fund;

    private String oldStatus;
    private String newStatus;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by_account_id")
    private Account updatedBy;

    @CreationTimestamp
    private LocalDateTime updatedAt;

    @Column(length = 500)
    private String reason;

    @Column(name = "file_name")
    private String fileName;

    @Column(name = "file_url")
    private String fileUrl;

}
