package server.services;

import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import server.dtos.FaceVerifyResponse;
import server.dtos.GetAttendancePageDto;
import server.models.Account;
import server.models.Attendance;
import server.models.enums.AttendanceStatus;
import server.models.enums.NotificationType;
import server.repositories.AccountRepository;
import server.repositories.AttendanceRepository;
import server.specification.AttendanceSpecifications;
import server.utils.ApiResponse;
import org.springframework.data.domain.*;

import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AttendanceService {

    private final AttendanceRepository attendanceRepository;
    private final AccountRepository accountRepository;
    private final UploadFileService uploadFileService;
    private final RestTemplate restTemplate = new RestTemplate();
    private final NotificationService notificationService;
    // Optional: NotificationService để nhắc nhở, inject vào nếu có

    // --- 1. Check-in ---
    public boolean hasCheckedInToday(Account account) {
        LocalDate today = LocalDate.now();
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime endOfDay = today.atTime(LocalTime.MAX);
        return attendanceRepository.existsByAccountAndCheckInTimeBetween(account, startOfDay, endOfDay);
    }

    public Attendance saveAttendanceRecord(Account account, String imagePath, FaceVerifyResponse verifyResponse) {
        Attendance attendance = Attendance.builder()
                .account(account)
                .checkInTime(LocalDateTime.now())
                .checkInImagePath(imagePath)
                .faceMatch(verifyResponse.isMatch())
                .locationValid(verifyResponse.isLocation_ok())
                .distanceKm(verifyResponse.getDistance_km())
                .checkedOut(false)
                .status(AttendanceStatus.CHECKED_IN)
                .build();
        return attendanceRepository.save(attendance);
    }

    // --- 2. Check-out ---
    public Attendance checkOut(Long accountId, MultipartFile checkoutImage) throws IOException {
        Account acc = accountRepository.findById(accountId)
                .orElseThrow(() -> new RuntimeException("Account not found"));

        LocalDate today = LocalDate.now();
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime endOfDay = today.atTime(LocalTime.MAX);

        Attendance att = attendanceRepository
                .findByAccountAndCheckInTimeBetweenAndStatus(acc, startOfDay, endOfDay, AttendanceStatus.CHECKED_IN);

        if (att == null)
            throw new RuntimeException("Bạn chưa check-in hôm nay hoặc đã check-out");

        att.setCheckOutTime(LocalDateTime.now());
        att.setCheckOutImagePath(
                checkoutImage != null ? uploadFileService.storeFile("attendance", checkoutImage) : null
        );
        att.setStatus(AttendanceStatus.CHECKED_OUT);
        return attendanceRepository.save(att);
    }

    // --- 3. Call Python Face Verify API ---
    public FaceVerifyResponse callPythonFaceVerifyAPI(MultipartFile liveImage, String knownImagePath, double latitude, double longitude) throws IOException {
        String pythonApiUrl = "http://localhost:5000/api/face-verify";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        ByteArrayResource liveImageResource = new ByteArrayResource(liveImage.getBytes()) {
            @Override
            public String getFilename() { return liveImage.getOriginalFilename(); }
        };
        ByteArrayResource knownImageResource = uploadFileService.createByteArrayResourceFromFile(knownImagePath);

        body.add("image", liveImageResource);
        body.add("known_image", knownImageResource);
        body.add("latitude", String.valueOf(latitude));
        body.add("longitude", String.valueOf(longitude));

        HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<FaceVerifyResponse> response = restTemplate.postForEntity(pythonApiUrl, requestEntity, FaceVerifyResponse.class);

            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                throw new IOException("Failed to verify face from Python service");
            }
            return response.getBody();

        } catch (HttpClientErrorException.Forbidden e) {
            String errorMessage = e.getResponseBodyAsString();
            throw new IOException("Face verification failed with 403 Forbidden: " + errorMessage);
        } catch (RestClientException e) {
            throw new IOException("Error calling Python face verification service: " + e.getMessage());
        }
    }

    // --- 4. Lưu ảnh check-in ---
    public String saveCheckInImage(MultipartFile file) throws IOException {
        return uploadFileService.storeFile("attendance", file);
    }

    public ApiResponse<?> getMyAttendancePage(GetAttendancePageDto req, String username) {
        Account user = accountRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Specification<Attendance> filterByMe = (root, query, cb) ->
                cb.equal(root.get("account"), user);

        return getAttendancePageInternal(req, filterByMe);
    }

    // --- 5. Lấy lịch sử chấm công của account ---
    public ApiResponse<?> getAttendancePageInternal(GetAttendancePageDto req, Specification<Attendance> extraSpec) {
        int pageSize = req.getPageSize() > 0 ? req.getPageSize() : 10;
        int pageNumber = Math.max(1, req.getPageNumber()) - 1;

        Sort.Direction direction = "desc".equalsIgnoreCase(req.getSortBy()) ? Sort.Direction.DESC : Sort.Direction.ASC;
        Pageable pageable = PageRequest.of(pageNumber, pageSize, direction, "checkInTime");

        AttendanceStatus status = null;
        try {
            if (req.getStatusFilter() != null && !req.getStatusFilter().isEmpty()) {
                status = AttendanceStatus.valueOf(req.getStatusFilter());
            }
        } catch (Exception ignored) {}

        LocalDateTime from = null;
        LocalDateTime to = null;
        try {
            if (req.getFromDate() != null) {
                from = LocalDate.parse(req.getFromDate()).atStartOfDay();
            }
            if (req.getToDate() != null) {
                to = LocalDate.parse(req.getToDate()).atTime(LocalTime.MAX);
            }
        } catch (Exception ignored) {}

        Account account = null;
        if (req.getAccountId() != null) {
            account = accountRepository.findById(req.getAccountId())
                    .orElseThrow(() -> new RuntimeException("Account not found"));
        }

        Specification<Attendance> spec = AttendanceSpecifications.byAccount(account)
                .and(AttendanceSpecifications.byStatus(status))
                .and(AttendanceSpecifications.fromDate(from))
                .and(AttendanceSpecifications.toDate(to))
                .and(AttendanceSpecifications.keyword(req.getSearchTerm()));

        if (extraSpec != null) {
            spec = spec.and(extraSpec);
        }

        Page<Attendance> page = attendanceRepository.findAll(spec, pageable);

        Map<String, Object> response = new HashMap<>();
        response.put("totalPage", page.getTotalPages());
        response.put("totalElements", page.getTotalElements());
        response.put("currentPage", page.getNumber() + 1);
        response.put("attendances", page.getContent()); // hoặc map DTO nếu cần

        return ApiResponse.success(response, "Fetched attendances with filter & paging");
    }

    // --- 6. Scheduled: Nhắc checkout 17h mỗi ngày ---
    // Chỉ sử dụng khi bạn cấu hình @EnableScheduling ở Spring Boot main
    @Scheduled(cron = "0 0 17 * * *")
    public void remindCheckOut() {
        LocalDate today = LocalDate.now();
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime endOfDay = today.atTime(LocalTime.MAX);

        List<Attendance> list = attendanceRepository.findAllByCheckInTimeBetweenAndStatus(startOfDay, endOfDay, AttendanceStatus.CHECKED_IN);

        for (Attendance att : list) {
            // Gửi thông báo nhắc nhở
            notificationService.createNotification(NotificationType.ATTENDANCE, att.getId(), false);
            // Cập nhật trạng thái thành MISSING_CHECKOUT
            att.setStatus(AttendanceStatus.MISSING_CHECKOUT);
            attendanceRepository.save(att);
        }
    }

    @Scheduled(cron = "0 0 8 8 * ?") // 8h sáng ngày 8 hàng tháng
    public void remindMissingCheckOutOnDay8() {
        LocalDate today = LocalDate.now(); // ngày hiện tại, ví dụ 8/2
        LocalDate firstDayOfPrevMonth = today.minusMonths(1).withDayOfMonth(1); // 1/1
        LocalDate lastDayOfPrevMonth = today.minusMonths(1).withDayOfMonth(today.minusMonths(1).lengthOfMonth()); // 31/1

        LocalDateTime from = firstDayOfPrevMonth.atStartOfDay();
        LocalDateTime to = lastDayOfPrevMonth.atTime(LocalTime.MAX);

        List<Attendance> missingRecords = getMissingCheckOutRecords(from, to);

        for (Attendance att : missingRecords) {
            notificationService.createNotification(NotificationType.ATTENDANCE, att.getId(), false);
            // Có thể thêm gửi mail hoặc tin nhắn cho nhân viên
        }
    }
    public List<Attendance> getMissingCheckOutRecords(LocalDateTime from, LocalDateTime to) {
        return attendanceRepository.findByStatusAndCheckInTimeBetween(AttendanceStatus.MISSING_CHECKOUT, from, to);
    }

    // --- 7. HR giải trình nếu thiếu check-out ---
    public Attendance resolveMissingCheckOut(Long attendanceId, String note, boolean approved) {
        Attendance att = attendanceRepository.findById(attendanceId)
                .orElseThrow(() -> new RuntimeException("Attendance record not found"));

        if (att.getStatus() != AttendanceStatus.MISSING_CHECKOUT) {
            throw new RuntimeException("This attendance record is not in MISSING_CHECKOUT status");
        }

        if (approved) {
            att.setStatus(AttendanceStatus.RESOLVED);
            att.setCheckOutNote(note);
            att.setCheckOutTime(LocalDateTime.now());
        } else {
            att.setStatus(AttendanceStatus.REJECTED);
            att.setCheckOutNote(note + " (not approved)");
        }
        Attendance saved = attendanceRepository.save(att);

        // Gửi notification kết quả HR giải trình
        notificationService.createNotification(NotificationType.ATTENDANCE, attendanceId, true);

        return saved;
    }

    public Attendance submitMissingCheckOutNote(Long attendanceId, String note) {
        Attendance att = attendanceRepository.findById(attendanceId)
                .orElseThrow(() -> new RuntimeException("Attendance record not found"));


        if (att.getStatus() != AttendanceStatus.MISSING_CHECKOUT) {
            throw new RuntimeException("This attendance record is not in MISSING_CHECKOUT status");
        }

        att.setCheckOutNote(note);
        Attendance saved = attendanceRepository.save(att);

        // Gửi thông báo cho HR
        notificationService.notifyHROnNoteSubmission(attendanceId);

        return saved;
    }

}
