package server.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import server.models.LeaveRequest;
import server.models.enums.LeaveStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface LeaveRequestRepository
        extends JpaRepository<LeaveRequest, Long>, JpaSpecificationExecutor<LeaveRequest> {

    // Các hàm filter phục vụ phân quyền sẽ viết ở Service/Specs
    List<LeaveRequest> findByStatus(LeaveStatus status);

    // (đã có sẵn trong JpaRepository, nhưng giữ lại cũng không sao)
    List<LeaveRequest> findAll();

    List<LeaveRequest> findBySenderIdAndStatus(Long senderId, LeaveStatus status);

    List<LeaveRequest> findByBatchIdOrderByStartDateAsc(String batchId);

    // Đếm số đơn nghỉ đã duyệt của từng ngày trong 1 tháng, theo phòng ban
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
}
