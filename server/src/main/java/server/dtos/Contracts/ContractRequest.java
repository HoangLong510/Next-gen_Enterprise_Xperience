package server.dtos.Contracts;

import lombok.Data;
import java.time.LocalDate;

@Data
public class ContractRequest {
    private String contractCode;
    private Long employeeId;
    private LocalDate startDate;
    private LocalDate endDate;
    private String type;
    private String status;
    private String fileUrl;
    private String note;
}
