package server.models;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "signature_samples")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SignatureSample {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", unique = true)
    private Account account;

    @Column(columnDefinition = "TEXT")
    private String signatureBase64;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
