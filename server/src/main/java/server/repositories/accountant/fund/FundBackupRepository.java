package server.repositories.accountant.fund;

import org.springframework.data.jpa.repository.JpaRepository;
import server.models.accountant.fund.FundBackup;

import java.util.List;

public interface FundBackupRepository extends JpaRepository<FundBackup, Long> {
    List<FundBackup> findByOriginalFundIdOrderByBackedUpAtDesc(Long originalFundId);
}
