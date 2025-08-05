package server.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import server.models.Contract;

import java.util.List;

@Repository
public interface ContractRepository extends JpaRepository<Contract, Long> {
    List<Contract> findByEmployee_Id(Long employeeId);
    List<Contract> findByStatus(server.models.enums.ContractStatus status);
    boolean existsByContractCode(String contractCode);
}
