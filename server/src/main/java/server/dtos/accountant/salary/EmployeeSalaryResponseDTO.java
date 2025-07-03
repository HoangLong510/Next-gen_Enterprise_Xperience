package server.dtos.accountant.salary;

import server.models.enums.SalaryStatus;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record EmployeeSalaryResponseDTO(
        Long id,
        Long employeeId,
        String employeeName,
        LocalDate payrollPeriod,
        Double basicSalary,
        Double overtimeSalary,
        Double bonus,
        Double allowance,
        Double insuranceDeduction,
        Double taxDeduction,
        Double netSalary,
        SalaryStatus status,
        String note,
        String createdBy,
        LocalDateTime createdAt
) {}
