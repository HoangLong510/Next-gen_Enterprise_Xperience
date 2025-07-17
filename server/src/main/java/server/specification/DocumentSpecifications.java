package server.specification;

import org.springframework.data.jpa.domain.Specification;
import server.models.Document;
import server.models.enums.DocumentStatus;
import server.models.enums.DocumentType;

public class DocumentSpecifications {
    public static Specification<Document> searchTerm(String term) {
        return (root, query, builder) -> {
            if (term == null || term.trim().isEmpty()) return null;
            String like = "%" + term.trim().toLowerCase() + "%";
            // Search theo title hoặc content
            return builder.or(
                    builder.like(builder.lower(root.get("title")), like),
                    builder.like(builder.lower(root.get("content")), like)
            );
        };
    }

    public static Specification<Document> status(DocumentStatus status) {
        return (root, query, builder) -> status == null ? null : builder.equal(root.get("status"), status);
    }

    public static Specification<Document> type(DocumentType type) {
        return (root, query, builder) -> type == null ? null : builder.equal(root.get("type"), type);
    }
}
