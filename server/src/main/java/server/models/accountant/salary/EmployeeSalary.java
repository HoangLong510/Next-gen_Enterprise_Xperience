package server.models.accountant.salary;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import server.models.Account;
import server.models.Employee;
import server.models.enums.SalaryStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "employee_salaries")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployeeSalary {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Kỳ lương
    @Column(nullable = false)
    private LocalDate payrollPeriod;

    // Lương cơ bản
    @Column(nullable = false)
    private Double basicSalary;

    // Lương tăng ca
    private Double overtimeSalary;

    // Thưởng
    private Double bonus;

    // Phụ cấp
    private Double allowance;

    // Bảo hiểm trừ
    private Double insuranceDeduction;

    // Thuế thu nhập trừ
    private Double taxDeduction;

    // Tổng lương thực lĩnh
    @Column(nullable = false)
    private Double netSalary;

    // Ghi chú
    private String note;

    // Trạng thái phiếu lương
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SalaryStatus status;

    // Nhân viên
    @ManyToOne
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    // Người tạo
    @ManyToOne
    @JoinColumn(name = "created_by", nullable = false)
    private Account createdBy;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
