package server.dtos.accountant.fund.transaction;

import java.time.LocalDateTime;

public record FundTransactionResponseDTO(
        Long id,
        String type,
        Double amount,
        String note,
        String createdBy,
        String createdByDisplay,
        String createdByAvatar,
        LocalDateTime createdAt,
        String fileUrl,
        String status,
        String approvalComment,
        String approvedBy,
        String approvedByDisplay,
        String approvedByAvatar,
        LocalDateTime approvedAt
) {}
