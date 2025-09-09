package server.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import server.models.Task;

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
}
