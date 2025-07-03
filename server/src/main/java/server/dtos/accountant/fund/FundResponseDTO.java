package server.dtos.accountant.fund;

import java.time.LocalDateTime;

public record FundResponseDTO(
        Long id,
        String name,
        Double balance,
        String status,
        String purpose,
        String createdBy,
        String updatedBy,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
