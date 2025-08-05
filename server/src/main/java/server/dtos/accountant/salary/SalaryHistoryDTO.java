package server.dtos.accountant.salary;

import lombok.Builder;
import lombok.Data;
import server.models.enums.PaymentMethod;
import server.models.enums.SalaryStatus;

import java.time.LocalDateTime;

@Data
@Builder
public class SalaryHistoryDTO {
    private Long id;
    private Integer month;
    private Integer year;
    private Long baseSalary;
    private Long actualSalary;
    private Long total;
    private SalaryStatus status;
    private PaymentMethod paymentMethod;
    private String fileUrl;
    private LocalDateTime createdAt;
    private String createdBy;
}
