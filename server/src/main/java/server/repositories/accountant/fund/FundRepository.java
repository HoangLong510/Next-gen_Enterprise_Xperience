package server.repositories.accountant.fund;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import server.models.accountant.fund.Fund;

public interface FundRepository extends JpaRepository<Fund, Long>, JpaSpecificationExecutor<Fund> {

    @Query("SELECT SUM(f.balance) FROM Fund f")
    Double getTotalBalance();


}
