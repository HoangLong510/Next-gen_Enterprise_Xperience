package server.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import server.models.Document;

import java.util.List;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long>, JpaSpecificationExecutor<Document> {

    @Query("""
        select (count(d) > 0) from Document d
        left join d.createdBy cb
        left join d.receiver r
        left join d.pm pm
        left join d.accountant acc
        where d.id = :id and (
            cb.username = :username
            or r.username = :username
            or (pm is not null and pm.username = :username)
            or (acc is not null and acc.username = :username)
        )
    """)
    boolean hasAccess(@Param("id") Long id, @Param("username") String username);

    List<Document> findByProject_Id(Long projectId);
}
