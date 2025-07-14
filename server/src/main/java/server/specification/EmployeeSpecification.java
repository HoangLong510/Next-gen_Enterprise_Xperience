package server.specification;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import org.springframework.data.jpa.domain.Specification;
import server.models.Employee;
import server.models.enums.Role;

import java.util.Collection;

public class EmployeeSpecification {
    public static Specification<Employee> searchTerm(String term) {
        return (root, query, builder) -> {
            if (term == null || term.trim().isEmpty()) return null;
            String like = "%" + term.trim().toLowerCase() + "%";

            Join<Object, Object> accountJoin = root.join("account", JoinType.LEFT);

            return builder.or(
                    builder.like(builder.lower(accountJoin.get("username")), like),
                    builder.like(builder.lower(root.get("firstName")), like),
                    builder.like(builder.lower(root.get("lastName")), like),
                    builder.like(
                            builder.lower(
                                    builder.concat(
                                            builder.concat(root.get("firstName"), " "),
                                            root.get("lastName")
                                    )
                            ),
                            like
                    ),
                    builder.like(
                            builder.lower(
                                    builder.concat(
                                            builder.concat(root.get("lastName"), " "),
                                            root.get("firstName")
                                    )
                            ),
                            like
                    )
            );
        };
    }

    public static Specification<Employee> inDepartmentOrNoDepartment(Long departmentId) {
        return (root, query, builder) -> {
            if (departmentId == null) return null;
            return builder.or(
                    builder.equal(root.get("department").get("id"), departmentId),
                    builder.isNull(root.get("department"))
            );
        };
    }

    public static Specification<Employee> noDepartment() {
        return (root, query, builder) -> builder.isNull(root.get("department"));
    }

    public static Specification<Employee> inDepartment(Long departmentId) {
        return (root, query, builder) -> {
            if (departmentId == null) return null;
            return builder.equal(root.get("department").get("id"), departmentId);
        };
    }

    public static Specification<Employee> hasAnyRole(Collection<Role> roles) {
        return (root, query, builder) -> {
            if (roles == null || roles.isEmpty()) return null;

            Join<Object, Object> accountJoin = root.join("account", JoinType.LEFT);
            return accountJoin.get("role").in(roles);
        };
    }
}
