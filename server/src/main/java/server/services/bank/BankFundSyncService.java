package server.services.bank;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import server.models.Account;
import server.models.accountant.fund.Fund;
import server.models.accountant.fund.FundTransaction;
import server.models.bank.BankTransaction;
import server.models.enums.TransactionStatus;
import server.models.enums.bank.BankTxType;
import server.repositories.AccountRepository;
import server.repositories.accountant.fund.FundRepository;
import server.repositories.accountant.fund.FundTransactionRepository;
import server.utils.FundGenerator;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class BankFundSyncService {

    private final FundGenerator fundGenerator;
    private final FundRepository fundRepository;
    private final FundTransactionRepository fundTxRepo;
    private final AccountRepository accountRepo;

    @Value("${app.system.username:system}")
    private String systemUsername;

    private Account systemAccount() {
        return accountRepo.findByUsername(systemUsername)
                .orElseGet(() -> accountRepo.findFirstByRoleOrderByIdAsc(server.models.enums.Role.ADMIN)
                        .orElseThrow(() -> new IllegalStateException("No system/admin account to attribute FundTransaction")));
    }


    @Transactional
    public void syncFromBankTx(BankTransaction tx) {
        if (tx == null) return;

        // Chuẩn hoá refId
        String normRefId = normalizeRefId(tx.getRefId());

        // 0) Chặn trùng: ưu tiên refId, fallback bankTx.id
        if (normRefId != null && fundTxRepo.existsByBankRefId(normRefId)) {
            // đã log rồi -> chỉ cập nhật số dư & thoát
            syncBalanceOnlyInternal(tx.getBalance());
            return;
        }
        if (tx.getId() != null && fundTxRepo.existsByBankTx_Id(tx.getId())) {
            syncBalanceOnlyInternal(tx.getBalance());
            return;
        }

        // 1) Cập nhật số dư tuyệt đối theo accumulated/balance
        syncBalanceOnlyInternal(tx.getBalance());

        // 2) Nếu amount = 0 thì không tạo lịch sử (tránh log rác)
        long amount = tx.getAmount() == null ? 0L : tx.getAmount();
        if (amount == 0L) return;

        // 3) Tạo lịch sử lần đầu (idempotent theo refId/bankTx.id ở trên)
        Fund fund = fundGenerator.generateBankFund();

        FundTransaction ft = new FundTransaction();
        ft.setFund(fund);
        ft.setType(tx.getType() == BankTxType.CREDIT ? "INCREASE" : "DECREASE");
        ft.setAmount(Math.abs(toDouble(amount)));
        ft.setNote(buildNote(tx));
        ft.setBankTx(tx);
        ft.setBankRefId(normRefId);

        var sys = systemAccount();
        ft.setCreatedBy(sys);
        ft.setStatus(TransactionStatus.APPROVED);
        ft.setApprovedBy(sys);
        ft.setApprovedAt(LocalDateTime.now());

        fundTxRepo.save(ft);
    }

    @Transactional
    public void syncBalanceOnlyFromLong(long balance) {
        syncBalanceOnlyInternal(balance);
    }

    private void syncBalanceOnly(BankTransaction tx) {
        if (tx == null) return;
        syncBalanceOnlyInternal(tx.getBalance());
    }

    private void syncBalanceOnlyInternal(Long balance) {
        long bal = balance == null ? 0L : balance;
        Fund fund = fundGenerator.generateBankFund();
        fund.setBalance(toDouble(bal));
        fundRepository.save(fund);
    }

    private String buildNote(BankTransaction tx) {
        StringBuilder sb = new StringBuilder();
        sb.append("[Bank webhook] ")
                .append(tx.getType()).append(" ")
                .append(tx.getAmount()).append(" | ")
                .append("refId=").append(normalizeRefId(tx.getRefId()));
        if (tx.getDescription() != null && !tx.getDescription().isBlank()) {
            sb.append(" | desc=").append(tx.getDescription());
        }
        return sb.toString();
    }

    private String normalizeRefId(String refId) {
        if (refId == null) return null;
        String trimmed = refId.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private double toDouble(long v) {
        return (double) v;
    }
}
