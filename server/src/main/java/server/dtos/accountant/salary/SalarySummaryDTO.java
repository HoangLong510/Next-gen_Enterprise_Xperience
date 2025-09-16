package server.dtos.accountant.salary;

import lombok.Builder;
import lombok.Data;
import server.models.enums.SalaryStatus;

import java.time.LocalDateTime;

@Data
@Builder
public class SalarySummaryDTO {
    private Long id;
    private String code;
    private String role;
    private String department;

    private Double baseSalary;
    private Double actualSalary;

    private Double totalAllowance;
    private Double totalDeduction;

    private Double total;
    private Long otherAllowance;
    private Long otherDeduction;

    private SalaryStatus status;
    private Integer month;
    private Integer year;

    private String createdBy;
    private LocalDateTime createdAt;
    private String fileUrl;
}