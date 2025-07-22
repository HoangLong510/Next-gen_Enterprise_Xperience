package server.repositories;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import server.models.Task;

import java.time.LocalDate;
import java.util.List;

@Repository
@RequiredArgsConstructor
public class TaskRepositoryImpl {

    private final EntityManager entityManager;

    public List<Task> searchTasks(String keyword) {
        return entityManager.createQuery("""
            SELECT t FROM Task t
            JOIN FETCH t.project
            WHERE LOWER(t.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(t.description) LIKE LOWER(CONCAT('%', :keyword, '%'))
        """, Task.class)
                .setParameter("keyword", keyword)
                .getResultList();
    }

    public List<Task> filterByStatus(String status) {
        StringBuilder query = new StringBuilder("""
            SELECT t FROM Task t
            JOIN FETCH t.project
            WHERE 1=1
        """);

        if (status != null && !status.isBlank()) {
            query.append(" AND LOWER(t.status) = LOWER(:status) ");
        }

        if (!"COMPLETED".equalsIgnoreCase(status)) {
            query.append(" AND t.hidden = false ");
        }

        query.append(" ORDER BY t.deadline ASC ");

        var q = entityManager.createQuery(query.toString(), Task.class);

        if (status != null && !status.isBlank()) {
            q.setParameter("status", status);
        }

        return q.getResultList();
    }

    public List<Task> getAllVisible() {
        return entityManager.createQuery("""
            SELECT t FROM Task t
            JOIN FETCH t.project
            WHERE t.hidden = false
            ORDER BY t.deadline ASC
        """, Task.class).getResultList();
    }

    public List<Task> getCompletedTasks() {
        return entityManager.createQuery("""
            SELECT t FROM Task t
            JOIN FETCH t.project
            WHERE t.status = 'COMPLETED'
            ORDER BY t.deadline ASC
        """, Task.class).getResultList();
    }
}