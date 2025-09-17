package server.dtos.accountant.salary;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SalaryUpdateRequest {
    private Long baseSalary;
    private Long actualSalary;

    // Allowances
    private Long allowanceLunch;
    private Long allowancePhone;
    private Long allowanceResponsibility;
    private Long otherAllowance;

    // Deductions
    private Long deductionBhxh;
    private Long deductionBhyt;
    private Long deductionBhtn;
    private Long personalIncomeTax;
    private Long otherDeduction;

    // Tổng
    private Long totalSalary;
    private Long total;
}
