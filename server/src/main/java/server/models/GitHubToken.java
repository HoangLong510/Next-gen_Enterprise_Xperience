package server.models;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "github_tokens")
@Data
public class GitHubToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "access_token", nullable = false)
    private String accessToken;

    @OneToOne
    @JoinColumn(name = "account_id", unique = true)
    private Account account;
}