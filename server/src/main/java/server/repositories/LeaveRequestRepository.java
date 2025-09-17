package server.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import server.models.Account;
import server.models.LeaveRequest;
import server.models.enums.LeaveStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Repository
public interface LeaveRequestRepository
        extends JpaRepository<LeaveRequest, Long>, JpaSpecificationExecutor<LeaveRequest> {

    List<LeaveRequest> findByStatus(LeaveStatus status);

    List<LeaveRequest> findAll();

    List<LeaveRequest> findBySenderIdAndStatus(Long senderId, LeaveStatus status);

    List<LeaveRequest> findByBatchIdOrderByStartDateAsc(String batchId);

    @Query("SELECT lr FROM LeaveRequest lr " +
            "WHERE lr.sender.employee.department.id = :departmentId " +
            "AND lr.status = 'APPROVED' " +
            "AND lr.endDate >= :startDate " +
            "AND lr.startDate <= :endDate")
    List<LeaveRequest> findApprovedInMonth(
            @Param("departmentId") Long departmentId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    List<LeaveRequest> findByStatusInAndCreatedAtBetween(
            List<LeaveStatus> statuses,
            LocalDateTime startInclusive,
            LocalDateTime endExclusive
    );

    @Query("""
       SELECT lr FROM LeaveRequest lr
       WHERE lr.createdAt >= :start AND lr.createdAt < :end
         AND lr.status IN :statuses
       """)
    List<LeaveRequest> findForExpiry(LocalDateTime start,
                                     LocalDateTime end,
                                     Collection<LeaveStatus> statuses);

    @Query("""
       SELECT COUNT(lr) FROM LeaveRequest lr
       WHERE lr.sender = :sender
         AND lr.status = :status
         AND lr.updatedAt >= :start AND lr.updatedAt < :end
       """)
    long countMyStatusUpdatedInMonth(@Param("sender") Account sender,
                                     @Param("status") LeaveStatus status,
                                     @Param("start") LocalDateTime start,
                                     @Param("end") LocalDateTime end);
}
