package server.repositories.bank;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import server.models.bank.Topup;
import server.models.enums.bank.TopupStatus;


import java.time.LocalDateTime;
import java.util.Optional;

public interface TopupRepository extends JpaRepository<Topup, Long> {
    Page<Topup> findByAccount_IdOrderByIdDesc(Long accountId, Pageable pageable);

    Page<Topup> findByOwner_IdOrderByIdDesc(Long ownerId, Pageable p);

    Optional<Topup> findFirstByCodeIgnoreCaseOrderByIdDesc(String code);

    Optional<Topup> findFirstByCodeIgnoreCaseAndStatusOrderByIdAsc(String code, TopupStatus status);

    @Modifying
    @Query("""
  update Topup t
     set t.status = server.models.enums.bank.TopupStatus.SUCCESS,
         t.sepayRefId = :refId,
         t.completedAt = :completedAt,
         t.amount = COALESCE(:amount, t.amount)
   where t.id = :id and t.status = server.models.enums.bank.TopupStatus.PENDING
""")
    int markSuccessIfPending(@Param("id") Long id,
                             @Param("refId") String refId,
                             @Param("completedAt") LocalDateTime completedAt,
                             @Param("amount") Long amount);
}