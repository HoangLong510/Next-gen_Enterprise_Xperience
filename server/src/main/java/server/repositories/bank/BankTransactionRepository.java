package server.repositories.bank;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import server.models.bank.BankTransaction;
import server.models.enums.bank.BankTxType;


import java.time.LocalDateTime;
import java.util.Optional;

public interface BankTransactionRepository extends JpaRepository<BankTransaction, Long> {
    Optional<BankTransaction> findByRefId(String refId);

    // đã có
    Page<BankTransaction> findByTypeAndTxTimeBetween(
            BankTxType type, LocalDateTime from, LocalDateTime to, Pageable pageable);

    // lấy giao dịch mới nhất
    Optional<BankTransaction> findTopByOrderByTxTimeDesc();

    //lấy giao dịch mới nhất theo account
    Optional<BankTransaction> findTopByAccountNoOrderByTxTimeDesc(String accountNo);

    //các biến thể cho history
    Page<BankTransaction> findByAccountNoOrderByTxTimeDesc(String accountNo, Pageable pageable);

    Page<BankTransaction> findByTxTimeBetweenOrderByTxTimeDesc(LocalDateTime from, LocalDateTime to, Pageable pageable);

    Page<BankTransaction> findByAccountNoAndTxTimeBetweenOrderByTxTimeDesc(
            String accountNo, LocalDateTime from, LocalDateTime to, Pageable pageable);

    Page<BankTransaction> findByAccountNoAndTypeAndTxTimeBetweenOrderByTxTimeDesc(
            String accountNo, BankTxType type, LocalDateTime from, LocalDateTime to, Pageable pageable);

    Page<BankTransaction> findByTypeAndTxTimeBetweenOrderByTxTimeDesc(
            BankTxType type, LocalDateTime from, LocalDateTime to, Pageable pageable);

    Page<BankTransaction> findAllByOrderByTxTimeDesc(Pageable pageable);

    boolean existsByTxTimeAfter(LocalDateTime txTime);
}