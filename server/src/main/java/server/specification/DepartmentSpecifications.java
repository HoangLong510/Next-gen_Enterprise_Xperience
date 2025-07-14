package server.specification;

import org.springframework.data.jpa.domain.Specification;
import server.models.Department;
import server.models.enums.Role;

public class DepartmentSpecifications {
    public static Specification<Department> filterByRoleAndEmployee(Role role, Long employeeId) {
        return (root, query, cb) -> {
            if (role == Role.EMPLOYEE) {
                return cb.equal(root.join("employees").get("id"), employeeId);
            }
            if(role == Role.HOD) {
                return cb.equal(root.join("hod").get("id"), employeeId);
            }
            if (role == Role.ADMIN || role == Role.MANAGER) {
                // Không filter gì, lấy hết (return null thì không áp filter)
                return null;
            }
            // Role khác, trả về rỗng (không có phòng ban nào)
            return cb.disjunction();
        };
    }

    public static Specification<Department> searchTerm(String term) {
        return (root, query, cb) -> {
            if (term == null || term.trim().isEmpty()) return null;
            String like = "%" + term.trim().toLowerCase() + "%";

            return cb.or(
                    cb.like(cb.lower(root.get("name")), like),
                    cb.like(cb.lower(root.get("description")), like)
            );
        };
    }
}
