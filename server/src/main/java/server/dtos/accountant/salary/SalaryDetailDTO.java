package server.dtos.accountant.salary;

import lombok.Builder;
import lombok.Data;
import server.models.enums.PaymentMethod;
import server.models.enums.SalaryStatus;

import java.time.LocalDateTime;

@Data
@Builder
public class SalaryDetailDTO {
    private Long id;
    private String code;
    private EmployeeBasicInfoDTO employee;

    private Long baseSalary;
    private Integer workingDays;
    private Long actualSalary;

    private Long allowanceLunch;
    private Long allowancePhone;
    private Long allowanceResponsibility;
    private Long otherAllowance;
    private Long otherDeduction;

    private Long totalSalary;

    private Long deductionBhxh;
    private Long deductionBhyt;
    private Long deductionBhtn;

    private Long personalIncomeTax;
    private Long total;

    private Integer month;
    private Integer year;

    private LocalDateTime createdAt;
    private String createdBy;
    private String createdByAvatar;
    private LocalDateTime updatedAt;
    private Integer standardWorkingDays;
    private SalaryStatus status;
    private PaymentMethod paymentMethod;
    private String fileUrl;
}
