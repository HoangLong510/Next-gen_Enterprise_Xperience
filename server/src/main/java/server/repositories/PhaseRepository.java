package server.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import server.models.Phase;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface PhaseRepository extends JpaRepository<Phase, Long> {

    // Lấy tất cả phases theo project, sắp xếp theo sequence
    List<Phase> findByProjectIdOrderBySequence(Long projectId);
    List<Phase> findByProjectIdAndDeadlineAfter(Long projectId, LocalDate date);
    // Lấy tất cả phases kèm tasks theo project, sắp xếp theo sequence
    @Query("SELECT DISTINCT p FROM Phase p LEFT JOIN FETCH p.tasks "
            + "WHERE p.project.id = :projectId "
            + "ORDER BY p.sequence")
    List<Phase> findByProjectIdWithTasksOrderBySequence(@Param("projectId") Long projectId);

    // Lấy sequence lớn nhất trong project để tính sequence mới
    @Query("SELECT MAX(p.sequence) FROM Phase p WHERE p.project.id = :projectId")
    Integer findMaxSequenceByProject(@Param("projectId") Long projectId);

    // Tìm phase theo projectId và sequence (dùng để kiểm tra status của phase trước)
    Optional<Phase> findByProjectIdAndSequence(Long projectId, Integer sequence);

    List<Phase> findByProjectIdOrderBySequenceAsc(Long projectId);
    boolean existsByProjectId(Long projectId);
}
