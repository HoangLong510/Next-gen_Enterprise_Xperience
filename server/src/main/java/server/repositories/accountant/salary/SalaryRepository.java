package server.repositories.accountant.salary;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import server.models.Employee;
import server.models.accountant.salary.Salary;

import java.util.List;
import java.util.Optional;

public interface SalaryRepository extends JpaRepository<Salary, Long> {

    @Query("SELECT d.name FROM Department d")
    List<String> findAllDepartmentNames();




    List<Salary> findAllByEmployeeId(Long employeeId);

    Salary findTopByEmployeeIdOrderByCreatedAtDesc(Long employeeId);


    @Query("""
    SELECT s FROM Salary s
    WHERE s.employee.id = :employeeId
    AND FUNCTION('MONTH', s.createdAt) = :month
    AND FUNCTION('YEAR', s.createdAt) = :year
""")
    Optional<Salary> findSalaryByEmployeeAndMonth(
            @Param("employeeId") Long employeeId,
            @Param("month") int month,
            @Param("year") int year
    );
    boolean existsByEmployeeIdAndMonthAndYear(Long employeeId, int month, int year);

}

