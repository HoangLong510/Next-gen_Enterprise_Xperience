package server.dtos.bank;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import server.models.enums.bank.TopupStatus;


import java.time.LocalDateTime;

@Data @NoArgsConstructor @AllArgsConstructor
public class TopupResponse {
    private Long id;
    private String code;
    private Long amount;
    private String bankAccountNo;
    private TopupStatus status;
    private String sepayRefId;
    private LocalDateTime completedAt;
    private LocalDateTime createdAt;
}