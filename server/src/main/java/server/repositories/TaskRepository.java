package server.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import server.models.Task;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {
}