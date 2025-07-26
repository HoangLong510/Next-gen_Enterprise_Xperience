package server.repositories.accountant.salary;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import server.models.Employee;
import server.models.accountant.salary.Salary;

import java.util.List;
import java.util.Optional;

public interface SalaryRepository extends JpaRepository<Salary, Long> {

    @Query("SELECT d.name FROM Department d")
    List<String> findAllDepartmentNames();

    List<Salary> findAllByEmployeeId(Long employeeId);
}

