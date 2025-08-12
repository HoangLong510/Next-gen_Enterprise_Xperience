package server.dtos.Contracts;

import lombok.Data;
import java.time.LocalDate;

@Data
public class ContractResponse {
    private Long id;
    private String contractCode;
    private Long employeeId;
    private String employeeName; // firstName + " " + lastName (hoặc chỉ lấy employee info đơn giản)
    private LocalDate startDate;
    private LocalDate endDate;
    private String type;
    private String status;
    private String fileUrl;
    private String note;
}
