package server.specification;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import org.springframework.data.jpa.domain.Specification;
import server.models.Account;
import server.models.enums.Role;

public class AccountSpecifications {
    public static Specification<Account> searchTerm(String term) {
        return (root, query, builder) -> {
            if (term == null || term.trim().isEmpty()) return null;
            String like = "%" + term.trim().toLowerCase() + "%";

            Join<Object, Object> empJoin = root.join("employee", JoinType.LEFT);

            return builder.or(
                    builder.like(builder.lower(root.get("username")), like),
                    builder.like(builder.lower(empJoin.get("firstName")), like),
                    builder.like(builder.lower(empJoin.get("lastName")), like),
                    builder.like(builder.lower(empJoin.get("email")), like),
                    builder.like(builder.lower(empJoin.get("phone")), like),
                    builder.like(
                            builder.lower(
                                    builder.concat(
                                            builder.concat(empJoin.get("firstName"), " "),
                                            empJoin.get("lastName")
                                    )
                            ),
                            like
                    ),
                    builder.like(
                            builder.lower(
                                    builder.concat(
                                            builder.concat(empJoin.get("lastName"), " "),
                                            empJoin.get("firstName")
                                    )
                            ),
                            like
                    )
            );
        };
    }

    public static Specification<Account> role(Role role) {
        return (root, query, builder) -> role == null ? null : builder.equal(root.get("role"), role);
    }

    public static Specification<Account> enabled(Boolean enabled) {
        return (root, query, builder) -> enabled == null ? null : builder.equal(root.get("enabled"), enabled);
    }
}
