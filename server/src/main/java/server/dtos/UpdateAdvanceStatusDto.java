package server.dtos;

import lombok.Data;
import server.models.enums.CashAdvanceStatus;

@Data
public class UpdateAdvanceStatusDto {
    private CashAdvanceStatus status;
    private String note;
}