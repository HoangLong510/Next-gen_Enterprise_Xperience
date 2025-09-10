package server.repositories.specs;

import jakarta.persistence.criteria.*;
import org.springframework.data.jpa.domain.Specification;
import server.models.Account;
import server.models.Department;
import server.models.Employee;
import server.models.LeaveRequest;
import server.models.enums.LeaveStatus;
import server.models.enums.Role;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Arrays;

public final class LeaveRequestSpecs {

    private LeaveRequestSpecs() {}

    // ====== Bộ lọc cơ bản ======

    public static Specification<LeaveRequest> byStatus(LeaveStatus status) {
        return (root, query, cb) ->
                status == null ? cb.conjunction() : cb.equal(root.get("status"), status);
    }

    public static Specification<LeaveRequest> byDepartmentId(Long departmentId) {
        return (root, query, cb) -> {
            if (departmentId == null) return cb.conjunction();
            Join<LeaveRequest, Account> sender = root.join("sender", JoinType.LEFT);
            Join<Account, Employee> emp = sender.join("employee", JoinType.LEFT);
            Join<Employee, Department> dep = emp.join("department", JoinType.LEFT);
            return cb.equal(dep.get("id"), departmentId);
        };
    }

    public static Specification<LeaveRequest> byDepartmentName(String departmentName) {
        return (root, query, cb) -> {
            if (departmentName == null || departmentName.isBlank()) return cb.conjunction();

            Join<LeaveRequest, Account> sender = root.join("sender", JoinType.LEFT);
            Join<Account, Employee> emp = sender.join("employee", JoinType.LEFT);
            Join<Employee, Department> dep = emp.join("department", JoinType.LEFT);

            // Cách an toàn, bỏ qua hoa/thường:
            return cb.equal(
                    cb.lower(cb.coalesce(dep.get("name"), "")),
                    departmentName.trim().toLowerCase()
            );

            // Ghi chú: Nếu DB của bạn đang dùng collation *_ci (MySQL mặc định, so sánh không phân biệt hoa/thường),
            // bạn có thể dùng: return cb.equal(dep.get("name"), departmentName.trim());
            // để tận dụng index tốt hơn.
        };
    }


    public static Specification<LeaveRequest> bySenderNameKeyword(String keyword) {
        return (root, query, cb) -> {
            if (keyword == null || keyword.trim().isEmpty()) return cb.conjunction();
            final String kw = "%" + keyword.trim().toLowerCase() + "%";

            Join<LeaveRequest, Account> sender = root.join("sender", JoinType.LEFT);
            Join<Account, Employee> emp = sender.join("employee", JoinType.LEFT);

            // full name: firstName + " " + lastName  (coalesce để tránh null)
            Expression<String> firstName = cb.lower(cb.coalesce(emp.get("firstName"), ""));
            Expression<String> lastName  = cb.lower(cb.coalesce(emp.get("lastName"), ""));
            Expression<String> fullName  = cb.lower(cb.concat(cb.concat(firstName, " "), lastName));

            Expression<String> username  = cb.lower(cb.coalesce(sender.get("username"), ""));

            return cb.or(
                    cb.like(fullName, kw),
                    cb.like(username, kw)
            );
        };
    }

    /**
     * Lọc theo khoảng thời gian: đơn có overlap với [from, to]
     * (endDate >= from) AND (startDate <= to)
     */
    public static Specification<LeaveRequest> byDateRange(LocalDate from, LocalDate to) {
        // Chuẩn hóa biên: nếu to < from thì hoán đổi trước khi vào lambda
        LocalDate f = from;
        LocalDate t = to;
        if (f != null && t != null && t.isBefore(f)) {
            LocalDate tmp = f;
            f = t;
            t = tmp;
        }

        // Dùng biến final/effectively-final trong lambda
        final LocalDate fromF = f;
        final LocalDate toF   = t;

        return (root, query, cb) -> {
            if (fromF == null && toF == null) return cb.conjunction();

            if (fromF != null && toF != null) {
                // overlap: endDate >= fromF AND startDate <= toF
                return cb.and(
                        cb.greaterThanOrEqualTo(root.get("endDate"), fromF),
                        cb.lessThanOrEqualTo(root.get("startDate"), toF)
                );
            }
            if (fromF != null) {
                return cb.greaterThanOrEqualTo(root.get("endDate"), fromF);
            }
            // toF != null
            return cb.lessThanOrEqualTo(root.get("startDate"), toF);
        };
    }

    public static Specification<LeaveRequest> byMonth(YearMonth ym) {
        if (ym == null) return (root, query, cb) -> cb.conjunction();
        LocalDate from = ym.atDay(1);
        LocalDate to   = ym.atEndOfMonth();
        return byDateRange(from, to);
    }

    // ====== Visibility theo vai trò ======
    public static Specification<LeaveRequest> visibility(Account current) {
        return (root, query, cb) -> {
            if (current == null || current.getRole() == null) return cb.disjunction();

            Join<LeaveRequest, Account> sender   = root.join("sender", JoinType.LEFT);
            Join<LeaveRequest, Account> receiver = root.join("receiver", JoinType.LEFT);

            switch (current.getRole()) {
                case HR:
                    // HR thấy tất cả (kể cả của mình)
                    return cb.conjunction();

                case MANAGER: {
                    CriteriaBuilder.In<Role> in = cb.in(sender.get("role"));
                    Arrays.asList(Role.HOD, Role.PM, Role.HR, Role.ADMIN, Role.SECRETARY, Role.CHIEFACCOUNTANT)
                            .forEach(in::value);
                    return cb.and(
                            cb.equal(receiver.get("id"), current.getId()), // chỉ các đơn gửi cho manager hiện tại
                            in
                    );
                }

                case HOD:
                    // Đơn của chính HOD + đơn EMPLOYEE gửi cho HOD đó (receiver == current)
                    return cb.or(
                            cb.equal(sender.get("id"), current.getId()),
                            cb.and(
                                    cb.equal(sender.get("role"), Role.EMPLOYEE),
                                    cb.equal(receiver.get("id"), current.getId())
                            )
                    );

                case CHIEFACCOUNTANT:
                    // Đơn của chính CHIEFACCOUNTANT + đơn ACCOUNTANT gửi cho CHIEFACCOUNTANT đó
                    return cb.or(
                            cb.equal(sender.get("id"), current.getId()),
                            cb.and(
                                    cb.equal(sender.get("role"), Role.ACCOUNTANT),
                                    cb.equal(receiver.get("id"), current.getId())
                            )
                    );

                case PM:
                case ADMIN:
                case SECRETARY:
                case ACCOUNTANT:
                case EMPLOYEE:
                    // Chỉ thấy đơn của bản thân
                    return cb.equal(sender.get("id"), current.getId());

                default:
                    return cb.disjunction();
            }
        };
    }

    // ====== Aliases (giữ tương thích với tên cũ nếu Service đang dùng) ======
    public static Specification<LeaveRequest> visibleFor(Account current) {
        return visibility(current);
    }

    public static Specification<LeaveRequest> senderNameLike(String keyword) {
        return bySenderNameKeyword(keyword);
    }

    public static Specification<LeaveRequest> onDate(LocalDate date) {
        return byDateRange(date, date);
    }

    public static Specification<LeaveRequest> inMonth(YearMonth ym) {
        return byMonth(ym);
    }
}
