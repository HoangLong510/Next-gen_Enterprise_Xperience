package server.controllers;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;
import server.models.Account;
import server.models.Project;
import server.models.SubTask;
import server.repositories.AccountRepository;
import server.repositories.ProjectRepository;
import server.repositories.SubTaskRepository;
import server.services.GitHubTokenService;
import server.utils.JwtUtil;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/github")
@RequiredArgsConstructor
public class GitHubAuthController {

    private final ProjectRepository projectRepository;
    private final GitHubTokenService gitHubTokenService;
    private final SubTaskRepository subTaskRepository;
    private final JwtUtil jwtUtil;
    private final AccountRepository accountRepository;

    @Value("${github.client.id}")
    private String clientId;

    @Value("${github.client.secret}")
    private String clientSecret;

    @Value("${github.redirect.uri}")
    private String redirectUri;

    @GetMapping("/login")
    public ResponseEntity<?> loginGitHub(@RequestParam Long projectId) {
        Optional<Project> projectOpt = projectRepository.findById(projectId);
        if (projectOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Invalid projectId"));
        }

        String url = "https://github.com/login/oauth/authorize" +
                "?client_id=" + clientId +
                "&redirect_uri=" + redirectUri +
                "&scope=repo" +
                "&state=" + projectId;

        return ResponseEntity.ok(Map.of("url", url));
    }

    @GetMapping("/callback")
    public ResponseEntity<?> callbackGitHub(@RequestParam("code") String code,
                                            @RequestParam("state") String state,
                                            HttpServletRequest request) {
        // Lấy người dùng đang đăng nhập từ JWT
        String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "please-login-to-continue"));
        }

        String jwt = authHeader.substring(7);
        String username = jwtUtil.extractUsername(jwt);
        Account account = accountRepository.findByUsername(username).orElse(null);
        if (account == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "invalid-account"));
        }

        // Parse state: ví dụ "project:1" hoặc "subtask:42"
        String[] parts = state.split(":");
        if (parts.length != 2) {
            return ResponseEntity.badRequest().body(Map.of("message", "invalid-state"));
        }

        String context = parts[0];
        Long id;
        try {
            id = Long.parseLong(parts[1]);
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("message", "invalid-id"));
        }

        // Gọi GitHub để lấy access token
        RestTemplate restTemplate = new RestTemplate();
        Map<String, String> body = new HashMap<>();
        body.put("client_id", clientId);
        body.put("client_secret", clientSecret);
        body.put("code", code);
        body.put("redirect_uri", redirectUri);

        HttpHeaders headers = new HttpHeaders();
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        HttpEntity<Map<String, String>> requestEntity = new HttpEntity<>(body, headers);

        ResponseEntity<Map> response = restTemplate.postForEntity(
                "https://github.com/login/oauth/access_token",
                requestEntity,
                Map.class
        );

        if (!response.getStatusCode().is2xxSuccessful() || !response.getBody().containsKey("access_token")) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Failed to get access token from GitHub"));
        }

        String accessToken = (String) response.getBody().get("access_token");

        // Gắn token theo ngữ cảnh
        switch (context) {
            case "project" -> {
                Optional<Project> projectOpt = projectRepository.findById(id);
                if (projectOpt.isEmpty()) {
                    return ResponseEntity.badRequest().body(Map.of("message", "Project not found"));
                }
                Account pmAccount = projectOpt.get().getProjectManager();
                gitHubTokenService.saveToken(pmAccount, accessToken);
                return ResponseEntity.ok(Map.of("message", "GitHub connected for project PM"));
            }
            case "subtask" -> {
                Optional<SubTask> subtaskOpt = subTaskRepository.findById(id);
                if (subtaskOpt.isEmpty()) {
                    return ResponseEntity.badRequest().body(Map.of("message", "SubTask not found"));
                }
                gitHubTokenService.saveToken(account, accessToken);
                return ResponseEntity.ok(Map.of("message", "GitHub connected for subtask user"));
            }
            default -> {
                return ResponseEntity.badRequest().body(Map.of("message", "Unknown context"));
            }
        }
    }
}