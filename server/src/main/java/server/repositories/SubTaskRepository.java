package server.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import server.models.SubTask;
import server.models.enums.SubTaskStatus;

import java.util.List;

public interface SubTaskRepository extends JpaRepository<SubTask, Long> {
    SubTask findByGithubBranch(String githubBranch);
    List<SubTask> findByStatus(SubTaskStatus status);
}