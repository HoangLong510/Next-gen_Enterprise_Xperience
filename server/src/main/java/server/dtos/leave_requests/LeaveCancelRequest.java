package server.dtos.leave_requests;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LeaveCancelRequest {
    @NotBlank(message = "Bạn phải nhập lý do hủy!")
    private String reason;
}
