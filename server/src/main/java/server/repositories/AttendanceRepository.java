package server.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import server.models.Account;
import server.models.Attendance;

import java.time.LocalDateTime;

public interface AttendanceRepository extends JpaRepository<Attendance, Long> {
    boolean existsByAccountAndCheckInTimeBetween(Account account, LocalDateTime start, LocalDateTime end);
}