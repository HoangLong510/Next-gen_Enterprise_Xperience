
package server.dtos.leave_requests;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;
import server.models.enums.LeaveType;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

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
    private LeaveType leaveType;
    private LocalTime startTime;
    private LocalTime endTime;
    @JsonFormat(pattern="yyyy-MM-dd")
    private java.util.List<LocalDate> daysOff;
}
