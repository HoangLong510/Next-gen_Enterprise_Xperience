package server.dtos.accountant.salary;

import java.time.LocalDate;

public record SalaryPaymentResponseDTO(
        Long id,
        Double amountPaid,
        LocalDate paymentDate,
        String paymentMethod,
        String note,
        String attachmentUrl,
        String createdBy
) {}