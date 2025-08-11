// server.controllers.GitHubAuthController.java
package server.controllers;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import server.models.Account;
import server.models.Project;
import server.models.Task;
import server.repositories.AccountRepository;
import server.repositories.ProjectRepository;
import server.repositories.TaskRepository;
import server.services.GitHubTokenService;
import server.utils.JwtUtil;

import java.net.URI;
import java.util.*;

@RestController
@RequestMapping("/github")
@RequiredArgsConstructor
public class GitHubAuthController {

    private final ProjectRepository projectRepository;
    private final GitHubTokenService gitHubTokenService;
    private final TaskRepository taskRepository;
    private final JwtUtil jwtUtil;
    private final AccountRepository accountRepository;

    @Value("${github.client.id}")
    private String clientId;

    @Value("${github.client.secret}")
    private String clientSecret;

    @Value("${github.redirect.uri}")
    private String redirectUri;

    @Value("${app.client.url}")            // FE origin, ví dụ http://localhost:3000
    private String clientUrl;

    @GetMapping("/login")
    public ResponseEntity<?> loginGitHub(
            @RequestParam String context,                 // "project" | "task" | "user"
            @RequestParam(required = false) Long id,
            @RequestParam(required = false) String redirect, // FE page hiện tại
            HttpServletRequest request
    ) {
        String auth = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (auth == null || !auth.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "please-login-to-continue"));
        }

        // ✅ Lưu session tạm cho OAuth
        var session = request.getSession(true);
        session.setAttribute("oauth_jwt", auth.substring(7));
        session.setAttribute("oauth_ctx", context);
        if (id != null) session.setAttribute("oauth_id", id);

        // ✅ Chống open-redirect — chỉ cho phép redirect về domain FE
        String safeRedirect = (redirect != null && redirect.startsWith(clientUrl))
                ? redirect
                : clientUrl;
        session.setAttribute("oauth_redirect", safeRedirect);

        // ✅ CSRF state
        String state = UUID.randomUUID().toString();
        session.setAttribute("oauth_state", state);

        String url = "https://github.com/login/oauth/authorize"
                + "?client_id=" + clientId
                + "&redirect_uri=" + redirectUri
                + "&scope=repo"
                + "&state=" + state;

        // FE sẽ nhận { url } rồi window.location.href = url
        return ResponseEntity.ok(Map.of("url", url));
    }

    @GetMapping("/callback")
    public ResponseEntity<?> callbackGitHub(
            @RequestParam("code") String code,
            @RequestParam("state") String state,
            HttpServletRequest request
    ) {
        var session = request.getSession(false);
        if (session == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "session-expired"));
        }

        String savedState = (String) session.getAttribute("oauth_state");
        String jwt = (String) session.getAttribute("oauth_jwt");
        String context = (String) session.getAttribute("oauth_ctx");
        Long id = (Long) session.getAttribute("oauth_id");
        String redirectBack = (String) session.getAttribute("oauth_redirect");

        if (savedState == null || !savedState.equals(state) || jwt == null || context == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "invalid-oauth-session"));
        }

        // Đổi code -> access_token
        var rest = new RestTemplate();
        var body = new HashMap<String, String>();
        body.put("client_id", clientId);
        body.put("client_secret", clientSecret);
        body.put("code", code);
        body.put("redirect_uri", redirectUri);

        var headers = new HttpHeaders();
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        var reqEntity = new HttpEntity<>(body, headers);
        var tokenRes = rest.postForEntity("https://github.com/login/oauth/access_token", reqEntity, Map.class);

        if (!tokenRes.getStatusCode().is2xxSuccessful() || !tokenRes.getBody().containsKey("access_token")) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "exchange-failed"));
        }
        String accessToken = (String) tokenRes.getBody().get("access_token");

        // Lấy account từ JWT
        String username = jwtUtil.extractUsername(jwt);
        Account me = accountRepository.findByUsername(username).orElse(null);
        if (me == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "invalid-account"));
        }

        // Lưu token theo context (và kiểm tra quyền)
        switch (context) {
            case "project" -> {
                if (id == null) return ResponseEntity.badRequest().body(Map.of("message", "missing-project-id"));
                Project prj = projectRepository.findById(id).orElse(null);
                if (prj == null) return ResponseEntity.badRequest().body(Map.of("message", "project-not-found"));
                if (prj.getProjectManager() == null || !prj.getProjectManager().getId().equals(me.getId())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "access-denied"));
                }
                gitHubTokenService.saveToken(me, accessToken);
            }
            case "task" -> {
                if (id == null) return ResponseEntity.badRequest().body(Map.of("message", "missing-task-id"));
                Task task = taskRepository.findById(id).orElse(null);
                if (task == null) return ResponseEntity.badRequest().body(Map.of("message", "task-not-found"));
                if (task.getAssignee() == null || !task.getAssignee().getId().equals(me.getId())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "access-denied"));
                }
                gitHubTokenService.saveToken(me, accessToken);
            }
            case "user" -> gitHubTokenService.saveToken(me, accessToken);
            default -> {
                return ResponseEntity.badRequest().body(Map.of("message", "unknown-context"));
            }
        }

        // Dọn session tạm
        session.removeAttribute("oauth_state");
        session.removeAttribute("oauth_jwt");
        session.removeAttribute("oauth_ctx");
        session.removeAttribute("oauth_id");
        session.removeAttribute("oauth_redirect");

        // ✅ 302 về trang FE ban đầu, thêm flag
        String back = (redirectBack != null && redirectBack.startsWith(clientUrl)) ? redirectBack : clientUrl;
        String finalUrl = back + (back.contains("?") ? "&" : "?") + "github=connected";
        return ResponseEntity.status(HttpStatus.FOUND).location(URI.create(finalUrl)).build();
    }

    // ✅ NEW: kiểm tra token đã liên kết chưa
    @GetMapping("/token/status")
    public ResponseEntity<?> tokenStatus(HttpServletRequest request) {
        String auth = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (auth == null || !auth.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("connected", false));
        }
        String username = jwtUtil.extractUsername(auth.substring(7));
        Account me = accountRepository.findByUsername(username).orElse(null);
        boolean connected = me != null && gitHubTokenService.getToken(me).isPresent();
        return ResponseEntity.ok(Map.of("connected", connected));
    }
}
