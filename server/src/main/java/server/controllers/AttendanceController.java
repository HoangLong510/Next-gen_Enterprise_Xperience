package server.controllers;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import server.dtos.FaceVerifyResponse;
import server.models.Account;
import server.models.Attendance;
import server.repositories.AccountRepository;
import server.repositories.AttendanceRepository;
import server.services.AttendanceService;

import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Optional;

@RestController
@RequestMapping("/attendance")
public class AttendanceController {

    private final AttendanceService attendanceService;
    private final AccountRepository accountRepository;
    private final AttendanceRepository attendanceRepository;

    public AttendanceController(AttendanceService attendanceService,
                                AccountRepository accountRepository, AttendanceRepository attendanceRepository) {
        this.attendanceService = attendanceService;
        this.accountRepository = accountRepository;
        this.attendanceRepository = attendanceRepository;
    }

    @PostMapping("/check-in")
    public ResponseEntity<?> faceCheckIn(
            @RequestParam Long accountId,
            @RequestParam("image") MultipartFile image,
            @RequestParam double latitude,
            @RequestParam double longitude
    ) {
        try {
            Account account = accountRepository.findById(accountId)
                    .orElseThrow(() -> new RuntimeException("Account not found: " + accountId));

            // Kiểm tra xem đã chấm công hôm nay chưa
            LocalDate today = LocalDate.now();
            LocalDateTime startOfDay = today.atStartOfDay();
            LocalDateTime endOfDay = today.atTime(LocalTime.MAX);

            boolean alreadyCheckedIn = attendanceRepository.existsByAccountAndCheckInTimeBetween(account, startOfDay, endOfDay);
            if (alreadyCheckedIn) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("User already checked in today");
            }

            String knownImagePath = account.getEmployee().getAvatar();
            if (knownImagePath == null || knownImagePath.isEmpty()) {
                return ResponseEntity.status(400).body("Employee avatar not found");
            }

            FaceVerifyResponse verifyResult = attendanceService.callPythonFaceVerifyAPI(image, knownImagePath, latitude, longitude);
            String savedImagePath = attendanceService.saveCheckInImage(image);
            Attendance attendance = attendanceService.saveAttendanceRecord(account, savedImagePath, verifyResult);

            return ResponseEntity.ok(attendance);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Face check-in failed: " + e.getMessage());
        }
    }

    @GetMapping("/check-in/status")
    public ResponseEntity<Boolean> checkInStatus(@RequestParam Long accountId) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new RuntimeException("Account not found: " + accountId));

        boolean checkedIn = attendanceService.hasCheckedInToday(account);

        return ResponseEntity.ok(checkedIn);
    }
}
