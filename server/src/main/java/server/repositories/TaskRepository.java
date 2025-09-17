package server.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import server.models.Task;
import server.models.enums.TaskStatus;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {
    Task findByGithubBranch(String githubBranch);
    @Query("""
           select t from Task t
           where t.phase.project.id = :projectId
             and t.deadline > :date
             and t.status <> server.models.enums.TaskStatus.CANCELED
           """)
    List<Task> findTasksDeadlineAfter(@Param("projectId") Long projectId,
                                      @Param("date") LocalDate date);
    boolean existsByPhaseIdAndNameIgnoreCaseAndHiddenFalse(Long phaseId, String name);

    @Query("""
        select t from Task t
        left join fetch t.phase p
        left join fetch p.project proj
        where t.id = :id
    """)
    Optional<Task> findWithPhaseAndProjectById(@Param("id") Long id);
    /**
     * ✅ TRUY VẤN CHO KANBAN:
     * - Lấy toàn bộ task của project (theo cột/phase bất kỳ)
     * - KHÔNG lọc deadline
     * - KHÔNG loại CANCELED (để cột CANCELED vẫn hiển thị đúng)
     * - Loại các task bị ẩn (hidden = false)
     *
     * Gợi ý sắp xếp cơ bản theo Phase.seq rồi Task.id để ổn định:
     * (nếu bạn có bảng order riêng thì TaskService sẽ map lại thứ tự sau)
     */
    @Query("""
        select t
        from Task t
        join fetch t.phase p
        join fetch p.project proj
        where proj.id = :projectId
          and t.hidden = false
        order by p.sequence asc, t.id asc
    """)
    List<Task> findKanbanTasksByProject(@Param("projectId") Long projectId);

    /**
     * Kiểm tra Project có ít nhất 1 Phase đang IN_PROGRESS
     * và trong Phase đó có Task ở trạng thái PLANNING/IN_PROGRESS/IN_REVIEW/COMPLETED
     * (loại bỏ CANCELED và task hidden).
     */
    @Query("""
        select (count(t) > 0)
        from Task t
        where t.phase.project.id = :projectId
          and t.phase.status = server.models.enums.PhaseStatus.IN_PROGRESS
          and t.status in :allowed
          and t.hidden = false
    """)
    boolean existsLiveTaskInActivePhase(@Param("projectId") Long projectId,
                                        @Param("allowed") List<TaskStatus> allowed);
}
