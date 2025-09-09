package server.controllers.bank;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import server.services.bank.BankWebhookService;

import java.util.Map;


@RestController @RequestMapping("/webhooks") @RequiredArgsConstructor
public class WebhookController {
    private final BankWebhookService webhookService;

    @PostMapping(path="/sepay", consumes="application/json", produces="application/json")
    public ResponseEntity<?> onSepay(@RequestBody String body) {
        try {
            webhookService.upsertFromWebhook(body);
            return ResponseEntity.status(201).body(Map.of("success", true));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

}
