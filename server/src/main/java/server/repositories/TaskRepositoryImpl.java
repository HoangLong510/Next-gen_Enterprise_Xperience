package server.repositories;

import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import server.models.Task;

import java.util.List;

@Repository
@RequiredArgsConstructor
public class TaskRepositoryImpl {

    private final EntityManager entityManager;

    public List<Task> searchTasks(String keyword) {
        String jpql = """
            SELECT t FROM Task t
            JOIN FETCH t.phase p
            JOIN FETCH p.project proj
            WHERE LOWER(t.name) LIKE LOWER(CONCAT('%', :kw, '%'))
               OR LOWER(t.description) LIKE LOWER(CONCAT('%', :kw, '%'))
        """;
        TypedQuery<Task> query = entityManager.createQuery(jpql, Task.class);
        query.setParameter("kw", keyword);
        return query.getResultList();
    }

    public List<Task> filterByStatus(String status) {
        StringBuilder sb = new StringBuilder();
        sb.append("SELECT t FROM Task t");
        sb.append(" JOIN FETCH t.phase p");
        sb.append(" JOIN FETCH p.project proj");
        sb.append(" WHERE 1=1");
        if (status != null && !status.isBlank()) {
            sb.append(" AND LOWER(t.status) = LOWER(:status)");
        }
        if (!"COMPLETED".equalsIgnoreCase(status)) {
            sb.append(" AND t.hidden = false");
        }
        sb.append(" ORDER BY t.deadline ASC");

        TypedQuery<Task> query = entityManager.createQuery(sb.toString(), Task.class);
        if (status != null && !status.isBlank()) {
            query.setParameter("status", status);
        }
        return query.getResultList();
    }

    public List<Task> getAllVisible() {
        String jpql = """
            SELECT t FROM Task t
            JOIN FETCH t.phase p
            JOIN FETCH p.project proj
            WHERE t.hidden = false
            ORDER BY t.deadline ASC
        """;
        return entityManager.createQuery(jpql, Task.class)
                .getResultList();
    }

    public List<Task> getCompletedTasks() {
        String jpql = """
            SELECT t FROM Task t
            JOIN FETCH t.phase p
            JOIN FETCH p.project proj
            WHERE t.status = 'COMPLETED'
            ORDER BY t.deadline ASC
        """;
        return entityManager.createQuery(jpql, Task.class)
                .getResultList();
    }
}
