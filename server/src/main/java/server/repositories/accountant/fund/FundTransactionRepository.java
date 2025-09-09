package server.repositories.accountant.fund;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import server.models.accountant.fund.FundTransaction;
import server.models.enums.TransactionStatus;

import java.util.List;
import java.util.Optional;

public interface FundTransactionRepository extends JpaRepository<FundTransaction, Long>, JpaSpecificationExecutor<FundTransaction> {
    List<FundTransaction> findByFundIdOrderByCreatedAtDesc(Long fundId);
    long countByType(String type);
    long count();

    @Query("SELECT SUM(t.amount) FROM FundTransaction t WHERE t.type = 'INCREASE' AND t.status = 'APPROVED'")
    Double getTotalIncreased();

    @Query("SELECT SUM(t.amount) FROM FundTransaction t WHERE t.type = 'DECREASE' AND t.status = 'APPROVED'")
    Double getTotalDecreased();

    long countByFundId(Long fundId);

    long countFundTransactionsByStatus(TransactionStatus status);

    boolean existsByBankRefId(String bankRefId);
    boolean existsByBankTx_Id(Long bankTxId);
}
