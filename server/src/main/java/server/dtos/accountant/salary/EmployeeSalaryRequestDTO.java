package server.dtos.accountant.salary;

import jakarta.validation.constraints.*;
import java.time.LocalDate;

public record EmployeeSalaryRequestDTO(
        @NotNull(message = "employeeId is required")
        Long employeeId,

        @NotNull(message = "payrollPeriod is required")
        LocalDate payrollPeriod,

        @NotNull(message = "basicSalary is required")
        @PositiveOrZero
        Double basicSalary,

        @PositiveOrZero
        Double overtimeSalary,

        @PositiveOrZero
        Double bonus,

        @PositiveOrZero
        Double allowance,

        @PositiveOrZero
        Double insuranceDeduction,

        @PositiveOrZero
        Double taxDeduction,

        String note
) {}