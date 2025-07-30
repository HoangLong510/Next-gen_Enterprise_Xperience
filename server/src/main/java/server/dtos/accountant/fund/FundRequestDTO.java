package server.dtos.accountant.fund;

import lombok.Data;

@Data
public class FundRequestDTO {
    private String name;
    private Double balance;
    private String purpose;
}
