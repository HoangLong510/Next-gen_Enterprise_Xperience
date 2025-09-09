// server/services/bank/BankQueryService.java
package server.services.bank;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import server.dtos.bank.BankSnapshotDto;
import server.dtos.bank.BankTransactionDto;
import server.models.bank.BankTransaction;
import server.models.bank.BankTransactionMapper;
import server.repositories.bank.BankTransactionRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BankQueryService {
    private final BankTransactionRepository repo;

    private static final String COMPANY_ACCOUNT_NO = "65609062003";
    private static final String COMPANY_BANK = "TPBank";

    @Transactional(readOnly = true)
    public BankSnapshotDto getSnapshot() {
        var latest = repo.findTopByOrderByTxTimeDesc().orElse(null);
        BankSnapshotDto dto = new BankSnapshotDto();
        dto.setAccountNo(COMPANY_ACCOUNT_NO + " - " + COMPANY_BANK);
        if (latest != null) {
            dto.setBalance(latest.getBalance());
            dto.setAsOf(latest.getTxTime());
        } else {
            dto.setBalance(0);
        }
        return dto;
    }

    @Transactional(readOnly = true)
    public Page<BankTransactionDto> getHistory(LocalDate fromDate, LocalDate toDate, int page, int size) {
        int p = Math.max(page, 1) - 1;
        int s = Math.min(Math.max(size, 1), 100);
        var pageable = PageRequest.of(p, s);

        LocalDateTime from, to;

        if (fromDate == null && toDate == null) {
            from = LocalDate.now().minusDays(30).atStartOfDay();
            to   = LocalDateTime.now();
        } else {
            from = (fromDate != null) ? fromDate.atStartOfDay() : LocalDate.now().minusDays(30).atStartOfDay();
            to   = (toDate   != null) ? toDate.atTime(LocalTime.MAX) : LocalDateTime.now();
        }

        Page<BankTransaction> pageData = repo.findByTxTimeBetweenOrderByTxTimeDesc(from, to, pageable);

        var dtoList = pageData.getContent().stream()
                .map(BankTransactionMapper::toDto)
                .collect(Collectors.toList());

        return new PageImpl<>(dtoList, pageable, pageData.getTotalElements());
    }
}
