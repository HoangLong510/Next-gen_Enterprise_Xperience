package server.models.bank;

import server.dtos.bank.BankTransactionDto;
import server.models.bank.BankTransaction;

public class BankTransactionMapper {
    public static BankTransactionDto toDto(BankTransaction e) {
        if (e == null) return null;
        return BankTransactionDto.builder()
                .id(e.getId())
                .refId(e.getRefId())
                .accountNo(e.getAccountNo())
                .counterAccountNo(e.getCounterAccountNo())
                .counterName(e.getCounterName())
                .type(e.getType())
                .amount(e.getAmount())
                .balance(e.getBalance())
                .description(e.getDescription())
                .txTime(e.getTxTime())
                .build();
    }
}
