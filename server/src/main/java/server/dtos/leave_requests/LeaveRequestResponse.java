
package server.dtos.leave_requests;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class LeaveRequestResponse {
    private Long id;
    private String reason;
    private LocalDate startDate;
    private LocalDate endDate;
    private String status;
    private AccountResponse sender;
    private AccountResponse receiver;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String signature;
}
