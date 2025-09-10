package server.services.bank;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import server.repositories.accountant.fund.FundRepository;
import server.repositories.bank.BankTransactionRepository;
import server.utils.FundGenerator;

@Service
@RequiredArgsConstructor
public class BankMaintenanceService {
    private final BankTransactionRepository txRepo;
    private final FundRepository fundRepo;
    private final FundGenerator fundGenerator;

    @Transactional
    public void resyncFundBalanceFromLatestTx() {
        txRepo.findTopByOrderByTxTimeDesc().ifPresent(tx -> {
            var fund = fundGenerator.generateBankFund();
            fund.setBalance((double) tx.getBalance());
            fundRepo.save(fund);
        });
    }
}
