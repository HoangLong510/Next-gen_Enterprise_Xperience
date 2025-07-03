package server.repositories.accountant.salary;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import server.models.accountant.salary.EmployeeSalary;
import server.models.enums.SalaryStatus;

import java.time.LocalDate;
import java.util.List;

public interface EmployeeSalaryRepository extends JpaRepository<EmployeeSalary, Long> {

    // Tìm tất cả phiếu lương của 1 nhân viên
    List<EmployeeSalary> findByEmployee_Id(Long employeeId);

    // Tìm tất cả phiếu lương của 1 nhân viên theo trạng thái
    List<EmployeeSalary> findByEmployee_IdAndStatus(Long employeeId, SalaryStatus status);

    // Tìm phiếu lương theo kỳ lương
    List<EmployeeSalary> findByPayrollPeriod(LocalDate payrollPeriod);

    // Tìm phiếu lương theo trạng thái
    List<EmployeeSalary> findByStatus(SalaryStatus status);

    // Tính tổng lương thực lĩnh của nhân viên trong khoảng thời gian
    @Query("SELECT COALESCE(SUM(s.netSalary), 0) FROM EmployeeSalary s " +
            "WHERE s.employee.id = :employeeId " +
            "AND s.payrollPeriod BETWEEN :startDate AND :endDate")
    Double sumNetSalaryByEmployeeInPeriod(Long employeeId, LocalDate startDate, LocalDate endDate);
}
