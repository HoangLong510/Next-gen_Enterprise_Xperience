package server.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import server.models.SignatureSample;
import server.models.Account;
import java.util.Optional;

public interface SignatureSampleRepository extends JpaRepository<SignatureSample, Long> {
    Optional<SignatureSample> findByAccount(Account account);
}
