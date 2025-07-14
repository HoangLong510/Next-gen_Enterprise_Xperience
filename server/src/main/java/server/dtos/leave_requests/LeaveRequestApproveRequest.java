package server.dtos.leave_requests;

import lombok.Data;

@Data
public class LeaveRequestApproveRequest {
    private String signature; // base64 image
}
