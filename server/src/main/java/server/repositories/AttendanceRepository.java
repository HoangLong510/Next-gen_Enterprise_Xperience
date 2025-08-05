package server.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import server.models.Account;
import server.models.Attendance;

import java.time.LocalDateTime;

public interface AttendanceRepository extends JpaRepository<Attendance, Long> {
    boolean existsByAccountAndCheckInTimeBetween(Account account, LocalDateTime start, LocalDateTime end);

    @Query("SELECT COUNT(DISTINCT DATE(a.checkInTime)) FROM Attendance a " +
            "WHERE a.account.id = :accountId " +
            "AND a.faceMatch = true AND a.locationValid = true " +
            "AND MONTH(a.checkInTime) = :month AND YEAR(a.checkInTime) = :year")
    int countWorkingDays(@Param("accountId") Long accountId,
                         @Param("month") int month,
                         @Param("year") int year);
}