package server.repositories;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import server.models.LeaveRequest;
import server.models.enums.LeaveStatus;

import java.util.List;

@Repository
public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, Long> {
    // Các hàm filter phục vụ phân quyền sẽ viết ở Service
    List<LeaveRequest> findBySenderId(Long senderId);
    List<LeaveRequest> findByReceiverId(Long receiverId);
    List<LeaveRequest> findByStatus(LeaveStatus status);
    List<LeaveRequest> findAll();
}
