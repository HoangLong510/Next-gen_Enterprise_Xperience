package server.dtos;
import lombok.Data;

@Data
public class CreateCashAdvanceDto {
    private Long taskId;
    private Double amount;
    private String reason;
    private String unitName;
    private String departmentOrAddress;
    private String recipient;
    private String amountText;
    private String repaymentDeadline;
    private String signatureDataUrl;
}