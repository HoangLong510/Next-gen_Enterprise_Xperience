package server.repositories.accountant.fund;

import org.springframework.data.jpa.repository.JpaRepository;
import server.models.accountant.fund.FundTransaction;

import java.util.List;

public interface FundTransactionRepository extends JpaRepository<FundTransaction, Long> {
    List<FundTransaction> findByFundIdOrderByCreatedAtDesc(Long fundId);
    long countByType(String type);

}
