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
    @Column(nullable = false)
    private Boolean checkedOut = false;

    // Ghi chú hoặc giải trình nếu thiếu checkout
    private String checkOutNote;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AttendanceStatus status = AttendanceStatus.CHECKED_IN;
}
