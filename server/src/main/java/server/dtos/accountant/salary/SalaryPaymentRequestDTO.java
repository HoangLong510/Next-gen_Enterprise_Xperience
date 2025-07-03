package server.dtos.accountant.salary;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;

public record SalaryPaymentRequestDTO(
        @NotNull(message = "amountPaid is required")
        @Positive(message = "amountPaid must be positive")
        Double amountPaid,

        @NotNull(message = "paymentDate is required")
        LocalDate paymentDate,

        String paymentMethod,
        String note,
        MultipartFile attachment
) {}
