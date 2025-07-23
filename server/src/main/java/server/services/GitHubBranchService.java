package server.services;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import server.dtos.BranchRequestDto;
import server.models.Account;
import server.models.Project;
import server.models.SubTask;
import server.repositories.AccountRepository;
import server.repositories.SubTaskRepository;
import server.utils.ApiResponse;
import server.utils.JwtUtil;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class GitHubBranchService {

    private final JwtUtil jwtUtil;
    private final AccountRepository accountRepository;
    private final SubTaskRepository subTaskRepository;
    private final GitHubTokenService gitHubTokenService;

    public ApiResponse<?> createBranch(BranchRequestDto dto, HttpServletRequest request) {
        // 1. Lấy JWT từ header
        String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ApiResponse.errorServer("please-login-to-continue");
        }

        String jwt = authHeader.substring(7);
        String username = jwtUtil.extractUsername(jwt);
        Account account = accountRepository.findByUsername(username).orElse(null);
        if (account == null) {
            return ApiResponse.errorServer("invalid-account");
        }

        // 2. Lấy SubTask
        Optional<SubTask> subTaskOpt = subTaskRepository.findById(dto.getSubTaskId());
        if (subTaskOpt.isEmpty()) {
            return ApiResponse.notfound("SubTask not found");
        }

        SubTask subTask = subTaskOpt.get();

        // 3. Kiểm tra quyền
        if (!subTask.getAssignee().getAccount().equals(account)) {
            return ApiResponse.errorServer("unauthorized");
        }

        // 4. Lấy token GitHub
        String token = dto.getAccessToken();
        if (token == null || token.isBlank()) {
            Optional<String> tokenOpt = gitHubTokenService.getToken(account);
            if (tokenOpt.isEmpty()) {
                return ApiResponse.errorServer("please-login-github-to-continue");
            }
            token = tokenOpt.get();
        }

        // 5. Ghép tên branch
        String newBranch = dto.getBranchName() + "-subtask-" + subTask.getId();

        // 6. Lấy thông tin repo
        Project project = subTask.getTask().getProject();
        String owner = project.getRepoOwner();
        String repo = project.getRepoName();
        String baseBranch = project.getDefaultBranch();

        // 7. Lấy SHA của base branch
        String sha = getBaseBranchSha(owner, repo, baseBranch, token);

        // 8. Gọi GitHub API để tạo branch
        String url = "https://api.github.com/repos/" + owner + "/" + repo + "/git/refs";
        RestTemplate restTemplate = new RestTemplate();

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        headers.setContentType(MediaType.APPLICATION_JSON);

        String payload = """
            {
              "ref": "refs/heads/%s",
              "sha": "%s"
            }
            """.formatted(newBranch, sha);

        HttpEntity<String> requestEntity = new HttpEntity<>(payload, headers);
        ResponseEntity<String> response = restTemplate.postForEntity(url, requestEntity, String.class);

        if (!response.getStatusCode().is2xxSuccessful()) {
            return ApiResponse.errorServer("Failed to create branch");
        }

        // 9. Lưu vào DB
        subTask.setGithubBranch(newBranch);
        subTask.setBranchCreated(true);
        subTaskRepository.save(subTask);

        return ApiResponse.success(null, "Branch created successfully");
    }

    private String getBaseBranchSha(String owner, String repo, String branch, String token) {
        String url = "https://api.github.com/repos/" + owner + "/" + repo + "/git/ref/heads/" + branch;

        RestTemplate restTemplate = new RestTemplate();

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));

        HttpEntity<Void> request = new HttpEntity<>(headers);
        ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, request, Map.class);

        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new RuntimeException("Failed to fetch base branch SHA");
        }

        Map<String, Object> body = response.getBody();
        Map<String, Object> object = (Map<String, Object>) body.get("object");

        return (String) object.get("sha");
    }
}