package server.dtos.leave_requests;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;
import server.models.enums.LeaveType;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
public class LeaveRequestCreateRequest {
    private String reason;
    private LocalDate startDate;
    private LocalDate endDate;
    private Long receiverId;
    private LeaveType leaveType;
    private LocalTime startTime;
    private LocalTime endTime;
    @JsonFormat(pattern="yyyy-MM-dd")
    private java.util.List<LocalDate> days; // cho nghỉ ngắt quãng (ưu tiên dùng nếu có)
}

