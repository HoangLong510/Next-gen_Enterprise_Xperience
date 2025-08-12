package server.models;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import server.models.enums.AttendanceStatus;

import java.time.LocalDateTime;
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Entity
@Table(name = "attendance")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Attendance {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Quan hệ nhiều Attendance - 1 Account
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id")
    private Account account;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime checkInTime;

    // Ảnh chấm công (đường dẫn lưu file trên server)
    private String checkInImagePath;

    // Kết quả xác thực mặt
    private Boolean faceMatch;

    // Kết quả kiểm tra vị trí
    private Boolean locationValid;

    // Khoảng cách vị trí (km)
    private Double distanceKm;

    // --- Thêm cho check-out ---
    private LocalDateTime checkOutTime;
    private String checkOutImagePath;

    // Ghi nhận trạng thái
    @Builder.Default
    @Column(nullable = false)
    private boolean checkedOut = false;

    @Column(columnDefinition = "TEXT")
    private String checkOutEmployeeNote;

    // HR phản hồi khi duyệt/từ chối
    @Column(columnDefinition = "TEXT")
    private String checkOutHrNote;

    // APPROVED / REJECTED (hoặc bạn có thể tạo enum riêng)
    private String hrDecision;

    private LocalDateTime hrResolvedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hr_resolved_by")
    private Account hrResolvedBy;


    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false)
    private AttendanceStatus status = AttendanceStatus.CHECKED_IN;
}
