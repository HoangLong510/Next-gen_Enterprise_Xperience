package server.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;
import server.models.Document;
import server.models.DocumentHistory;


@Repository
public interface DocumentHistoryRepository extends JpaRepository<DocumentHistory, Long> , JpaSpecificationExecutor<DocumentHistory> {
    long countByDocument(Document document);
}
