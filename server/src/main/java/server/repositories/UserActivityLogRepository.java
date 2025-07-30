package server.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import server.models.UserActivityLog;

import java.time.LocalDateTime;
import java.util.List;

public interface UserActivityLogRepository extends JpaRepository<UserActivityLog, Long> {
    List<UserActivityLog> findByUserIdAndTimestampBetween(Long userId, LocalDateTime start, LocalDateTime end);
}

