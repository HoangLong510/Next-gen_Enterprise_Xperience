package server.repositories.accountant.salary;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import server.models.accountant.salary.SalaryPayment;

import java.util.List;

public interface SalaryPaymentRepository extends JpaRepository<SalaryPayment, Long> {

    List<server.models.accountant.salary.SalaryPayment> findBySalary_Id(Long salaryId);

    @Query("SELECT COALESCE(SUM(p.amountPaid), 0) FROM SalaryPayment p WHERE p.salary.id = :salaryId")
    Double sumAmountBySalaryId(Long salaryId);
}
