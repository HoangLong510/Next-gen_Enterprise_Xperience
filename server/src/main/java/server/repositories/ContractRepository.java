package server.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import server.models.Contract;

import java.util.List;
import java.util.Optional;

@Repository
public interface ContractRepository extends JpaRepository<Contract, Long> {
    List<Contract> findByStatus(server.models.enums.ContractStatus status);
    boolean existsByContractCode(String contractCode);
    @Modifying
    @Query("""
  update Contract c
     set c.status = 'EXPIRED'
   where c.status <> 'EXPIRED'
     and c.endDate < :today
""")
    int bulkExpire(@Param("today") java.time.LocalDate today);

    @Query("SELECT c FROM Contract c " +
            "WHERE c.employee.id = :empId " +
            "AND c.status = 'ACTIVE' " +
            "ORDER BY c.startDate DESC")
    Optional<Contract> findActiveByEmployeeId(@Param("empId") Long empId);
}
