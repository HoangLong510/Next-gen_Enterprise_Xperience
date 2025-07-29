package server.specification;

import org.springframework.data.jpa.domain.Specification;
import server.models.Account;
import server.models.Attendance;
import server.models.enums.AttendanceStatus;

import java.time.LocalDateTime;

public class AttendanceSpecifications {

    public static Specification<Attendance> byAccount(Account account) {
        return (root, query, cb) -> account == null ? null : cb.equal(root.get("account"), account);
    }

    public static Specification<Attendance> byStatus(AttendanceStatus status) {
        return (root, query, cb) -> status == null ? null : cb.equal(root.get("status"), status);
    }

    public static Specification<Attendance> fromDate(LocalDateTime from) {
        return (root, query, cb) -> from == null ? null : cb.greaterThanOrEqualTo(root.get("checkInTime"), from);
    }

    public static Specification<Attendance> toDate(LocalDateTime to) {
        return (root, query, cb) -> to == null ? null : cb.lessThanOrEqualTo(root.get("checkInTime"), to);
    }

    // (Optional) Search theo tên nhân viên (nếu có join đến employee)
    public static Specification<Attendance> keyword(String keyword) {
        return (root, query, cb) -> {
            if (keyword == null || keyword.trim().isEmpty()) return null;
            String like = "%" + keyword.trim().toLowerCase() + "%";
            return cb.like(cb.lower(root.get("account").get("employee").get("firstName")), like);
        };
    }
}
