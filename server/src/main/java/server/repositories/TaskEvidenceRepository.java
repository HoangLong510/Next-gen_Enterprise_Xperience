// server/repositories/TaskEvidenceRepository.java
package server.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import server.models.TaskEvidence;

import java.util.List;

public interface TaskEvidenceRepository extends JpaRepository<TaskEvidence, Long> {
    List<TaskEvidence> findByTaskId(Long taskId);
    long countByTaskId(Long taskId);
    void deleteByTaskId(Long taskId);
}
