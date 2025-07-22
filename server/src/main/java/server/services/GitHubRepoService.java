package server.services;

import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@Service
public class GitHubRepoService {

    public record GitHubRepoInfo(String owner, String repo, String defaultBranch) {}

    public GitHubRepoInfo fetchRepoInfo(String repoUrl, String token) throws IOException {
        // Parse repo URL → lấy owner và repo name
        String[] parts = repoUrl.replace("https://github.com/", "").split("/");
        if (parts.length < 2) throw new IllegalArgumentException("Invalid repo URL");

        String owner = parts[0];
        String repo = parts[1];

        String apiUrl = "https://api.github.com/repos/" + owner + "/" + repo;

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));

        HttpEntity<Void> request = new HttpEntity<>(headers);
        RestTemplate restTemplate = new RestTemplate();

        try {
            ResponseEntity<Map> response = restTemplate.exchange(apiUrl, HttpMethod.GET, request, Map.class);
            Map body = response.getBody();

            String defaultBranch = (String) body.get("default_branch");
            return new GitHubRepoInfo(owner, repo, defaultBranch);

        } catch (HttpClientErrorException.Unauthorized e) {
            // Token hết hạn hoặc bị thu hồi
            throw new IllegalStateException("GITHUB_TOKEN_EXPIRED");
        } catch (HttpClientErrorException.NotFound e) {
            // Repo không tồn tại hoặc không có quyền
            throw new IllegalArgumentException("Invalid repo or access denied");
        }
    }
}