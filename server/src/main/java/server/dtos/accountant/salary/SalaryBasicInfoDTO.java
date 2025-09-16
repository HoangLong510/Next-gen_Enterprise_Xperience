package server.dtos.accountant.salary;

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

    private Long totalAllowance;

    private Long totalSalary;

    private Long deductionBhxh;
    private Long deductionBhyt;
    private Long deductionBhtn;
    private Long personalIncomeTax;
    private Long otherAllowance;
    private Long otherDeduction;

    private Long totalDeduction;

    private Long total;

    private Integer month;
    private Integer year;

    private String status;

    private String createdBy;
    private String createdAt;
}
