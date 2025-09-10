package server.dtos.Contracts;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class ContractRequest {

    @NotBlank
    @Pattern(regexp = "^[A-Z0-9\\-_/]{3,30}$", message = "invalid-contract-code")
    private String contractCode;

    @NotNull
    private Long employeeId;

    @NotNull
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate startDate;

    @NotNull
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate endDate;

    @NotBlank
    private String type; // PERMANENT | PROBATION | TEMPORARY

    @Size(max = 1000)
    private String note;

    private LocalDateTime createdAt;

    @NotNull
    @Digits(integer = 13, fraction = 2)
    @DecimalMin(value = "0.00")
    private BigDecimal basicSalary;
}
