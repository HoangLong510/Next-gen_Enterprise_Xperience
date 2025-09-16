package server.models.accountant.salary;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import server.models.Employee;
import server.models.enums.PaymentMethod;
import server.models.enums.SalaryStatus;

import java.time.LocalDateTime;

@Entity
@Table(name = "salaries")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Salary {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "employee_id")
    private Employee employee;

    private Long baseSalary;
    private Integer workingDays;
    private Long actualSalary;

    private Long allowanceLunch;
    private Long allowancePhone;
    private Long allowanceResponsibility;

    private Long totalSalary;

    private Long deductionBhxh;
    private Long deductionBhyt;
    private Long deductionBhtn;
    private Long otherAllowance;
    private Long otherDeduction;

    private Long personalIncomeTax;

    private Long total;

    private Integer month;
    private Integer year;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    private String rejectReason;
    private String createdBy;
    private String createdByAvatar;
    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SalaryStatus status;

    @Enumerated(EnumType.STRING)
    private PaymentMethod paymentMethod;

    private String fileUrl;
}
