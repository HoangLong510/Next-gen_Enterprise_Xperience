package server.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import server.models.Employee;
import server.models.enums.Role;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface EmployeeRepository extends JpaRepository<Employee, Long>, JpaSpecificationExecutor<Employee> {
    @Query("SELECT e FROM Employee e WHERE e.account.role IN :roles")
    List<Employee> findAllByAccountRoleIn(@Param("roles") List<Role> roles);

    Optional<Employee> findByEmail(String email);
    Optional<Employee> findByPhone(String phone);

    @Query("""
    SELECT e FROM Employee e
    WHERE NOT EXISTS (
        SELECT p FROM e.projects p WHERE p.id = :projectId
    )
    AND e.account.role IN ('EMPLOYEE', 'HOD')
""")
    List<Employee> findEmployeesNotInProjectWithValidRoles(@Param("projectId") Long projectId);

    @Query("""
    SELECT e FROM Employee e
    WHERE NOT EXISTS (
        SELECT p FROM e.projects p WHERE p.id = :projectId
    )
    AND (e.account.role = 'EMPLOYEE' OR e.account.role = 'HOD')
    AND LOWER(CONCAT(e.firstName, ' ', e.lastName)) LIKE LOWER(CONCAT('%', :keyword, '%'))
""")
    List<Employee> searchAvailableByRoleAndName(
            @Param("projectId") Long projectId,
            @Param("keyword") String keyword
    );

    @Query("""
    SELECT e FROM Employee e
    WHERE NOT EXISTS (
        SELECT p FROM e.projects p WHERE p.id = :projectId
    )
    AND e.account.role IN ('EMPLOYEE', 'HOD')
    AND (:departmentId IS NULL OR e.department.id = :departmentId)
    AND LOWER(CONCAT(e.firstName, ' ', e.lastName)) LIKE LOWER(CONCAT('%', :keyword, '%'))
""")
    List<Employee> filterAvailableEmployees(
            @Param("projectId") Long projectId,
            @Param("departmentId") Long departmentId,
            @Param("keyword") String keyword
    );

    Optional<Employee> findByCode(String code);

    // lấy Employee kèm Department và HOD (để xem chi tiết)
    @Query("""
    SELECT e FROM Employee e
    LEFT JOIN FETCH e.department d
    LEFT JOIN FETCH d.hod h
    LEFT JOIN FETCH h.account ha
    WHERE e.account.id = :accountId
""")
    Optional<Employee> findByAccountIdWithDepartmentAndHod(@Param("accountId") Long accountId);

    // tìm kiếm Employee kèm Department theo tên/email/phone
    @Query("""
    SELECT e FROM Employee e
    LEFT JOIN e.department d
    WHERE
      (:q IS NULL OR :q = '' 
        OR LOWER(CONCAT(e.firstName, ' ', e.lastName)) LIKE LOWER(CONCAT('%', :q, '%'))
        OR LOWER(e.email) LIKE LOWER(CONCAT('%', :q, '%'))
        OR e.phone LIKE CONCAT('%', :q, '%'))
      AND (:departmentId IS NULL OR (d IS NOT NULL AND d.id = :departmentId))
    ORDER BY e.lastName ASC, e.firstName ASC
""")
    List<Employee> searchEmployeesWithDepartment(
            @Param("q") String q,
            @Param("departmentId") Long departmentId
    );

    List<Employee> findByDepartment_IdIn(Collection<Long> departmentIds);
}
