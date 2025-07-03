package server.repositories.accountant.fund;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import server.models.accountant.fund.FundStatusLog;

import java.util.List;

public interface FundStatusLogRepository extends JpaRepository<FundStatusLog, Long> {
    List<FundStatusLog> findByFundIdOrderByUpdatedAtDesc(Long fundId);
    Page<FundStatusLog> findByFundId(Long fundId, Pageable pageable);
}
