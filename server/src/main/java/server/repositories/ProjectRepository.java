package server.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import server.models.Project;

@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {
    boolean existsByIdAndEmployees_Id(Long projectId, Long employeeId);

}