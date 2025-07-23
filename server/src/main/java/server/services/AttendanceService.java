package server.services;

import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import server.dtos.FaceVerifyResponse;
import server.models.Account;
import server.models.Attendance;
import server.repositories.AttendanceRepository;

import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Service
public class AttendanceService {

    private final AttendanceRepository attendanceRepository;
    private final UploadFileService uploadFileService;
    private final RestTemplate restTemplate = new RestTemplate();

    public AttendanceService(AttendanceRepository attendanceRepository,
                             UploadFileService uploadFileService) {
        this.attendanceRepository = attendanceRepository;
        this.uploadFileService = uploadFileService;
    }

    // Gọi API Python để verify khuôn mặt + vị trí
    public FaceVerifyResponse callPythonFaceVerifyAPI(MultipartFile liveImage, String knownImagePath, double latitude, double longitude) throws IOException {
        String pythonApiUrl = "http://localhost:5000/api/face-verify";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();

        ByteArrayResource liveImageResource = new ByteArrayResource(liveImage.getBytes()) {
            @Override
            public String getFilename() {
                return liveImage.getOriginalFilename();
            }
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
            // Lấy thông tin lỗi từ response body JSON của server Python
            String errorMessage = e.getResponseBodyAsString();
            // Bạn có thể parse JSON để lấy message nếu FaceVerifyResponse phù hợp
            // Tạm thời ném ngoại lệ với message này hoặc tạo FaceVerifyResponse lỗi
            throw new IOException("Face verification failed with 403 Forbidden: " + errorMessage);
        } catch (RestClientException e) {
            throw new IOException("Error calling Python face verification service: " + e.getMessage());
        }
    }

    public boolean hasCheckedInToday(Account account) {
        LocalDate today = LocalDate.now();
        LocalDateTime startOfDay = today.atStartOfDay(); // 00:00:00
        LocalDateTime endOfDay = today.atTime(LocalTime.MAX); // 23:59:59.999999999

        return attendanceRepository.existsByAccountAndCheckInTimeBetween(account, startOfDay, endOfDay);
    }

    // Lưu ảnh chấm công
    public String saveCheckInImage(MultipartFile file) throws IOException {
        return uploadFileService.storeFile("attendance", file);
    }

    // Lưu bản ghi chấm công
    public Attendance saveAttendanceRecord(Account account,
                                           String imagePath,
                                           FaceVerifyResponse verifyResponse) {
        Attendance attendance = Attendance.builder()
                .account(account)
                .checkInTime(LocalDateTime.now())
                .checkInImagePath(imagePath)
                .faceMatch(verifyResponse.isMatch())
                .locationValid(verifyResponse.isLocation_ok())
                .distanceKm(verifyResponse.getDistance_km())
                .build();

        return attendanceRepository.save(attendance);
    }
}
