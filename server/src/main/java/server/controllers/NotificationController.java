package server.controllers;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import server.dtos.NotificationResponse;
import server.services.NotificationService;
import server.utils.ApiResponse;

import java.util.List;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    // Nếu cần test create tay thì uncomment bên dưới
//    @PostMapping
//    public ResponseEntity<?> create(@RequestBody NotificationRequest request) {
//        try {
//            NotificationResponse saved = notificationService.createManualNotification(request);
//            return ResponseEntity.status(201)
//                    .body(ApiResponse.created(saved, "Notification created manually"));
//        } catch (Exception e) {
//            ApiResponse<?> response = ApiResponse.errorServer(e.getMessage());
//            return ResponseEntity.status(response.getStatus()).body(response);
//        }
//    }

    @GetMapping("/{recipientUsername}")
    public ResponseEntity<?> getByRecipient(@PathVariable String recipientUsername) {
        try {
            List<NotificationResponse> list = notificationService.getByRecipient(recipientUsername);
            return ResponseEntity.ok(ApiResponse.success(list, "Fetched notifications successfully"));
        } catch (Exception e) {
            ApiResponse<?> response = ApiResponse.errorServer(e.getMessage());
            return ResponseEntity.status(response.getStatus()).body(response);
        }
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(@PathVariable Long id) {
        try {
            notificationService.markAsRead(id);
            return ResponseEntity.ok(ApiResponse.success(null, "Notification marked as read"));
        } catch (Exception e) {
            ApiResponse<?> response = ApiResponse.errorServer(e.getMessage());
            return ResponseEntity.status(response.getStatus()).body(response);
        }
    }
}
