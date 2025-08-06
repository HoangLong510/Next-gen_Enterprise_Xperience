package server.services;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import server.models.Account;
import server.models.GitHubToken;
import server.repositories.GitHubTokenRepository;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class GitHubTokenService {

    private final GitHubTokenRepository gitHubTokenRepository;

    public void saveToken(Account account, String accessToken) {
        Optional<GitHubToken> existing = gitHubTokenRepository.findByAccount(account);

        GitHubToken token = existing.orElse(new GitHubToken());
        token.setAccount(account);
        token.setAccessToken(accessToken);

        gitHubTokenRepository.save(token);
    }

    public Optional<String> getToken(Account account) {
        return gitHubTokenRepository.findByAccount(account)
                .map(GitHubToken::getAccessToken);
    }

    public void removeToken(Account account) {
        gitHubTokenRepository.deleteByAccount(account);
    }
}