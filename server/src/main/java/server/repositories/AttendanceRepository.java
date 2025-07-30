package server.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import server.models.Account;
import server.models.Attendance;
import server.models.Document;
import server.models.enums.AttendanceStatus;

import java.time.LocalDateTime;
import java.util.List;

public interface AttendanceRepository extends JpaRepository<Attendance, Long>, JpaSpecificationExecutor<Attendance> {
    boolean existsByAccountAndCheckInTimeBetween(Account account, LocalDateTime start, LocalDateTime end);

    // Lấy các bản ghi của 1 account trong 1 tháng
    List<Attendance> findByAccountAndCheckInTimeBetween(Account account, LocalDateTime start, LocalDateTime end);

    Attendance findByAccountAndCheckInTimeBetweenAndStatus(Account account, LocalDateTime checkInTimeAfter, LocalDateTime checkInTimeBefore, AttendanceStatus status);

    List<Attendance> findAllByCheckInTimeBetweenAndStatus(LocalDateTime checkInTimeAfter, LocalDateTime checkInTimeBefore, AttendanceStatus status);
    List<Attendance> findByStatusAndCheckInTimeBetween(AttendanceStatus status, LocalDateTime from, LocalDateTime to);

    // Tìm attendance theo id và status
}