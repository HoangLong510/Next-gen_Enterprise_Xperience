package server.repositories;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import server.models.Project;

import java.util.List;

@Repository
@RequiredArgsConstructor
public class ProjectRepositoryImpl {

    private final EntityManager entityManager;

    public List<Project> searchProjects(String keyword) {
        return entityManager.createQuery("""
            SELECT p FROM Project p
        JOIN FETCH p.document d
        WHERE LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
           OR LOWER(d.code) LIKE LOWER(CONCAT('%', :keyword, '%'))
    """, Project.class)
                .setParameter("keyword", keyword)
                .getResultList();
    }

    public List<Project> filter(String status, String priority) {
        // Bỏ tham số priority, chỉ filter theo status
        StringBuilder query = new StringBuilder("""
        SELECT p FROM Project p
        LEFT JOIN FETCH p.document
        WHERE 1=1
    """);

        if (status != null && !status.isBlank()) {
            query.append(" AND LOWER(p.status) = LOWER(:status) ");
        }

        if (!"COMPLETED".equalsIgnoreCase(status)) {
            query.append(" AND p.hidden = false ");
        }

        // Loại bỏ p.priority khỏi ORDER BY
        query.append("""
        ORDER BY
            CASE
                WHEN p.status IN ('PLANNING', 'IN_PROGRESS') THEN 0
                ELSE 1
            END ASC,
            p.deadline ASC
    """);

        var q = entityManager.createQuery(query.toString(), Project.class);

        if (status != null && !status.isBlank()) {
            q.setParameter("status", status);
        }

        // Không còn set priority parameter

        return q.getResultList();
    }


    public List<Project> getAllVisible() {
        return entityManager.createQuery("""
        SELECT p FROM Project p
        LEFT JOIN FETCH p.document
        WHERE p.hidden = false
        ORDER BY 
            CASE 
                WHEN p.status IN ('PLANNING', 'IN_PROGRESS') THEN 0
                ELSE 1
            END ASC,
            p.deadline ASC
    """, Project.class).getResultList();
    }



    public List<Project> getDoneProjects() {
        return entityManager.createQuery("""
            SELECT p FROM Project p
            JOIN FETCH p.document
            WHERE p.status = 'COMPLETED'
            ORDER BY p.deadline ASC
        """, Project.class).getResultList();
    }
}
