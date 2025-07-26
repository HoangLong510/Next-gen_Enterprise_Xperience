package server.dtos.accountant.fund.salary;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SalaryBasicInfoDTO {
    private String code;
    private String employeeName;
    private String role;
    private String department;
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
    private Long total;
    private Integer month;
    private Integer year;
}