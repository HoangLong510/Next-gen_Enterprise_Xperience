package server.controllers;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import server.dtos.GetAttendancePageDto;
import server.models.Account;
import server.models.Attendance;
import server.models.enums.AttendanceStatus;
import server.repositories.AccountRepository;
import server.repositories.AttendanceRepository;
import server.services.AttendanceService;
import server.services.AuthService;
import server.utils.ApiResponse;

import java.io.IOException;
import java.security.Principal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@RestController
@RequestMapping("/attendance")
public class AttendanceController {

    private final AttendanceService attendanceService;
    private final AccountRepository accountRepository;
    private final AttendanceRepository attendanceRepository;
    private final AuthService authService;

    public AttendanceController(AttendanceService attendanceService,
                                AccountRepository accountRepository,
                                AttendanceRepository attendanceRepository, AuthService authService) {
        this.attendanceService = attendanceService;
        this.accountRepository = accountRepository;
        this.attendanceRepository = attendanceRepository;
        this.authService = authService;
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

            boolean alreadyCheckedIn = attendanceService.hasCheckedInToday(account);
            if (alreadyCheckedIn) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("User already checked in today");
            }

            if (account.getEmployee() == null || account.getEmployee().getAvatar() == null || account.getEmployee().getAvatar().isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Employee avatar not found");
            }

            String knownImagePath = account.getEmployee().getAvatar();

            var verifyResult = attendanceService.callPythonFaceVerifyAPI(image, knownImagePath, latitude, longitude);
            String savedImagePath = attendanceService.saveCheckInImage(image);
            Attendance attendance = attendanceService.saveAttendanceRecord(account, savedImagePath, verifyResult);

            return ResponseEntity.ok(attendance);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Face check-in failed: " + e.getMessage());
        }
    }

    @PostMapping("/check-out")
    public ResponseEntity<?> checkOut(
            @RequestParam Long accountId,
            @RequestParam("image") MultipartFile image,
            @RequestParam double latitude,
            @RequestParam double longitude
    ) {
        try {
            Attendance attendance = attendanceService.checkOut(accountId, image, latitude, longitude);
            return ResponseEntity.ok(attendance);
        } catch (RuntimeException | IOException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Check-out failed: " + e.getMessage());
        }
    }

    @PostMapping("/get-my-attendance")
    public ResponseEntity<?> getMyAttendance(@RequestBody GetAttendancePageDto req, Principal principal) {
        ApiResponse<?> response = attendanceService.getMyAttendancePage(req, principal.getName());
        return ResponseEntity.status(response.getStatus()).body(response);
    }

    @GetMapping("/today-status")
    public ResponseEntity<String> getTodayAttendanceStatus(@RequestParam Long accountId) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new RuntimeException("Account not found: " + accountId));

        LocalDate today = LocalDate.now();
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime endOfDay = today.atTime(LocalTime.MAX);

        // Tìm attendance trong ngày hôm nay
        Attendance att = attendanceRepository.findByAccountAndCheckInTimeBetween(account, startOfDay, endOfDay)
                .stream()
                .findFirst()
                .orElse(null);

        if (att == null) {
            return ResponseEntity.ok("NOT_CHECKED_IN");
        } else if (att.getStatus() == AttendanceStatus.CHECKED_IN) {
            return ResponseEntity.ok("CHECKED_IN");
        } else if (att.getStatus() == AttendanceStatus.CHECKED_OUT) {
            return ResponseEntity.ok("CHECKED_OUT");
        } else if (att.getStatus() == AttendanceStatus.MISSING_CHECKOUT) {
            return ResponseEntity.ok("MISSING_CHECKOUT");
        } else {
            return ResponseEntity.ok("NOT_CHECKED_IN");
        }
    }


    @GetMapping("/{attendanceId}")
    public ResponseEntity<?> getAttendanceById(@PathVariable Long attendanceId, HttpServletRequest request) {
        try {
            Attendance att = attendanceRepository.findById(attendanceId)
                    .orElseThrow(() -> new RuntimeException("Attendance record not found"));

            Account current = authService.getCurrentAccount(request);

            // Cho HR xem tất cả
            if (current.getRole().name().equals("HR")) {
                return ResponseEntity.ok(att);
            }

            // Chỉ chủ sở hữu mới xem được
            if (!att.getAccount().getId().equals(current.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Bạn không có quyền truy cập bản ghi này");
            }

            return ResponseEntity.ok(att);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @GetMapping("/missing-checkout")
    public ResponseEntity<List<Attendance>> getMissingCheckOut(
            @RequestParam String fromDate,
            @RequestParam String toDate
    ) {
        try {
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
            LocalDateTime from = LocalDate.parse(fromDate, formatter).atStartOfDay();
            LocalDateTime to = LocalDate.parse(toDate, formatter).atTime(23, 59, 59);

            List<Attendance> list = attendanceService.getMissingCheckOutRecords(from, to);
            return ResponseEntity.ok(list);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(null);
        }
    }
    @PostMapping("/submit-missing-checkout-note")
    public ResponseEntity<?> submitMissingCheckOutNote(
            @RequestParam Long attendanceId,
            @RequestParam String note
    ) {
        try {
            Attendance updated = attendanceService.submitMissingCheckOutNote(attendanceId, note);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @PostMapping("/resolve-missing-checkout")
    @PreAuthorize("hasAuthority('HR')")
    public ResponseEntity<?> resolveMissingCheckOut(
            @RequestParam Long attendanceId,
            @RequestParam String note,
            @RequestParam boolean approved,
            HttpServletRequest request
    ) {
        try {
            Account hr = authService.getCurrentAccount(request);
            Attendance updated = attendanceService.resolveMissingCheckOut(attendanceId, note, approved, hr);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }
}
