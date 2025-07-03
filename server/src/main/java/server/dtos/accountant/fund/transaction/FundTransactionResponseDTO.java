package server.dtos.accountant.fund.transaction;

import java.time.LocalDateTime;

public record FundTransactionResponseDTO(
        Long id,
        String type,
        Double amount,
        String note,
        String createdBy,
        LocalDateTime createdAt,
        String fileName,
        String fileUrl,
        String status,
        String approvalComment,
        String approvedBy,
        LocalDateTime approvedAt
) {}
