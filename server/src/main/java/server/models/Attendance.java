package server.models;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

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
}
