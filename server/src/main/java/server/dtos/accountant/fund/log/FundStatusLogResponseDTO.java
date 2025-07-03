package server.dtos.accountant.fund.log;

import lombok.Builder;

import java.time.LocalDateTime;

@Builder
public record FundStatusLogResponseDTO(
        Long id,
        String oldStatus,
        String newStatus,
        String reason,
        String fileName,
        String fileUrl,
        String updatedBy,
        LocalDateTime updatedAt
) {}
