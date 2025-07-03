package server.models.accountant.salary;

import jakarta.persistence.*;
import lombok.*;
import server.models.Account;


import java.time.LocalDate;

@Entity
@Table(name = "salary_payments")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SalaryPayment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Phiếu lương liên quan
    @ManyToOne
    @JoinColumn(name = "salary_id", nullable = false)
    private EmployeeSalary salary;

    // Số tiền thanh toán
    @Column(nullable = false)
    private Double amountPaid;

    // Ngày thanh toán
    @Column(nullable = false)
    private LocalDate paymentDate;

    // Hình thức thanh toán
    private String paymentMethod;

    // Ghi chú
    private String note;

    // File đính kèm chứng từ (URL)
    private String attachmentUrl;
    
    @ManyToOne
    @JoinColumn(name = "created_by", nullable = false)
    private Account createdBy;
}