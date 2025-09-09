package server.dtos.bank;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class BankSnapshotDto {
    private String accountNo;
    private long balance;
    private LocalDateTime asOf;
}

