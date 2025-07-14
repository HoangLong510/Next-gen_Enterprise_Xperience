package server.dtos.leave_requests;

import lombok.Data;

import java.time.LocalDate;


@Data
public class LeaveRequestCreateRequest {
    private String reason;
    private LocalDate startDate;
    private LocalDate endDate;
    private Long receiverId;
}

