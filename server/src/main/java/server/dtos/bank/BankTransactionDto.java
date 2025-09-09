package server.dtos.bank;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import server.models.enums.bank.BankTxType;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BankTransactionDto {
    private Long id;
    private String refId;
    private String accountNo;
    private String counterAccountNo;
    private String counterName;
    private BankTxType type;
    private Long amount;
    private Long balance;
    private String description;
    private LocalDateTime txTime;
}
