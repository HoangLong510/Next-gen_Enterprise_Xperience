package server.controllers;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import server.models.Account;
import server.models.UserActivityLog;
import server.models.enums.AccountStatus;
import server.repositories.AccountRepository;
import server.repositories.UserActivityLogRepository;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/activity")
@RequiredArgsConstructor
public class UserActivityController {

    @Autowired
    private UserActivityLogRepository logRepo;

    @Autowired
    private AccountRepository accRepo;

    @PostMapping("/heartbeat")
    public ResponseEntity<?> heartbeat(@RequestBody Map<String, Object> payload) {
        try {
            String username = payload.get("username").toString();

            Optional<Account> userOpt = accRepo.findByUsername(username);
            if (userOpt.isEmpty()) {
                return ResponseEntity.badRequest().body("Username '" + username + "' not found");
            }

            Account user = userOpt.get();

            user.setLastActiveAt(LocalDateTime.now());
            user.setStatus(AccountStatus.ONLINE);
            accRepo.save(user);

            UserActivityLog log = new UserActivityLog();
            log.setUserId(user.getId());
            log.setTimestamp(LocalDateTime.now());
            logRepo.save(log);

            return ResponseEntity.ok("heartbeat-received");

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Server error: " + e.getMessage());
        }
    }

}

