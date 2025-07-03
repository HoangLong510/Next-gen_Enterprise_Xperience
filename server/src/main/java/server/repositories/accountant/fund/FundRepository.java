package server.repositories.accountant.fund;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import server.models.accountant.fund.Fund;

public interface FundRepository extends JpaRepository<Fund, Long>, JpaSpecificationExecutor<Fund> {
    long countByStatus(String status);
}
