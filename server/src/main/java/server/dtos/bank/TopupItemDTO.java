// server/dtos/bank/TopupItemDTO.java
package server.dtos.bank;

import lombok.*;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TopupItemDTO {
    private Long id;
    private String code;
    private Long amount;
    private String bankAccountNo;
    private String status;          // String (PENDING/SUCCESS/…)
    private String sepayRefId;
    private LocalDateTime completedAt;
    private LocalDateTime createdAt;

    private OwnerDTO owner;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class OwnerDTO {
        private Long employeeId;
        private Long accountId;
        private String firstName;
        private String lastName;
        private String email;
        private String phone;
        private String avatar;
    }
}
