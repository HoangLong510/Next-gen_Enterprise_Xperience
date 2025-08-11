package server.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import server.models.TaskOrder;

import java.util.List;
import java.util.Optional;

@Repository
public interface TaskOrderRepository extends JpaRepository<TaskOrder, Long> {
    /**
     * Lấy tất cả thứ tự task của user, đã sắp xếp theo position.
     */
    List<TaskOrder> findByUserIdOrderByPosition(Long userId);

    /**
     * Tìm thứ tự cụ thể cho một task và user.
     */
    Optional<TaskOrder> findByUserIdAndTaskId(Long userId, Long taskId);
}
