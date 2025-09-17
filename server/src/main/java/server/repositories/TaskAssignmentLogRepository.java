
// server/repositories/TaskAssignmentLogRepository.java
        package server.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import server.models.TaskAssignmentLog;

import java.util.List;

@Repository
public interface TaskAssignmentLogRepository extends JpaRepository<TaskAssignmentLog, Long> {

    // Lấy theo taskId, mới nhất trước
    List<TaskAssignmentLog> findByTask_IdOrderByChangedAtDesc(Long taskId);
}