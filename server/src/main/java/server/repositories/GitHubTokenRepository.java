package server.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import server.models.Account;
import server.models.GitHubToken;

import java.util.Optional;

public interface GitHubTokenRepository extends JpaRepository<GitHubToken, Long> {
    Optional<GitHubToken> findByAccount(Account account);
    void deleteByAccount(Account account);
}