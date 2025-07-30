package server.dtos.accountant.fund;

import lombok.Data;

@Data
public class FundStatusUpdateRequest {
    private String newStatus;
    private String reason;
    private String fileName;
    private String fileUrl;
}
