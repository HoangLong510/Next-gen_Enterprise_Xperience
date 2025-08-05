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
    private String createdBy;
    private String createdByAvatar;
    private LocalDateTime createdAt;
    private String fileUrl;
    private Double total;
    private Integer month;
    private Integer year;
    private Double baseSalary;
    private Double actualSalary;
    private SalaryStatus status;

}