package server.repositories.accountant.fund;

import org.springframework.data.jpa.domain.Specification;
import server.models.accountant.fund.Fund;

import java.time.LocalDateTime;

public class FundSpecification {
    public static Specification<Fund> hasName(String name) {
        return (root, query, cb) -> name == null ? null :
                cb.like(cb.lower(root.get("name")), "%" + name.toLowerCase() + "%");
    }

    public static Specification<Fund> hasStatus(String status) {
        return (root, query, cb) -> status == null ? null :
                cb.equal(root.get("status"), status);
    }

    public static Specification<Fund> createdAfter(LocalDateTime date) {
        return (root, query, cb) -> date == null ? null :
                cb.greaterThanOrEqualTo(root.get("createdAt"), date);
    }

    public static Specification<Fund> createdBefore(LocalDateTime date) {
        return (root, query, cb) -> date == null ? null :
                cb.lessThanOrEqualTo(root.get("createdAt"), date);
    }

    public static Specification<Fund> balanceGreaterThan(Double amount) {
        return (root, query, cb) -> amount == null ? null :
                cb.greaterThanOrEqualTo(root.get("balance"), amount);
    }

    public static Specification<Fund> balanceLessThan(Double amount) {
        return (root, query, cb) -> amount == null ? null :
                cb.lessThanOrEqualTo(root.get("balance"), amount);
    }
}
