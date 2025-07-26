package server.dtos.accountant.fund.transaction;

import lombok.Data;

@Data
public class FundTransactionRequestDTO {
    private String type; // INCREASE or DECREASE
    private Double amount;
    private String note;
}
