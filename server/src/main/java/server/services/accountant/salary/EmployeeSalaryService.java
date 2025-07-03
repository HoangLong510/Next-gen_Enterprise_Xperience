package server.services.accountant.salary;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.BindingResult;
import server.dtos.accountant.salary.EmployeeSalaryRequestDTO;
import server.dtos.accountant.salary.EmployeeSalaryResponseDTO;
import server.models.Account;
import server.models.Employee;
import server.models.accountant.salary.EmployeeSalary;
import server.models.enums.SalaryStatus;
import server.repositories.EmployeeRepository;
import server.repositories.accountant.salary.EmployeeSalaryRepository;
import server.utils.ApiResponse;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EmployeeSalaryService {

    private final EmployeeSalaryRepository salaryRepository;
    private final EmployeeRepository employeeRepository;

    public ApiResponse<?> getAllSalaries() {
        List<EmployeeSalary> salaries = salaryRepository.findAll();
        List<EmployeeSalaryResponseDTO> dtos = mapToResponseList(salaries);
        return ApiResponse.success(dtos, "fetch-all-salaries");
    }

    public ApiResponse<?> getSalaryById(Long id) {
        return salaryRepository.findById(id)
                .map(salary -> ApiResponse.success(mapToResponse(salary), "fetch-salary-successfully"))
                .orElse(ApiResponse.notfound("salary-not-found"));
    }

    @Transactional
    public ApiResponse<?> createSalary(EmployeeSalaryRequestDTO dto, BindingResult bindingResult, Account account) {
        if (bindingResult.hasErrors()) {
            return ApiResponse.badRequest(bindingResult);
        }

        Employee employee = employeeRepository.findById(dto.employeeId())
                .orElseThrow(() -> new IllegalArgumentException("employee-not-found"));

        double netSalary = (safe(dto.basicSalary()) + safe(dto.overtimeSalary()) + safe(dto.bonus()) + safe(dto.allowance()))
                - (safe(dto.insuranceDeduction()) + safe(dto.taxDeduction()));

        EmployeeSalary salary = EmployeeSalary.builder()
                .employee(employee)
                .payrollPeriod(dto.payrollPeriod())
                .basicSalary(dto.basicSalary())
                .overtimeSalary(dto.overtimeSalary())
                .bonus(dto.bonus())
                .allowance(dto.allowance())
                .insuranceDeduction(dto.insuranceDeduction())
                .taxDeduction(dto.taxDeduction())
                .netSalary(netSalary)
                .note(dto.note())
                .status(SalaryStatus.DRAFT)
                .createdBy(account)
                .build();

        salaryRepository.save(salary);
        return ApiResponse.created(
                mapToResponse(salary),
                "salary-created-successfully"
        );
    }

    @Transactional
    public ApiResponse<?> updateSalary(Long id, EmployeeSalaryRequestDTO dto, BindingResult bindingResult) {
        if (bindingResult.hasErrors()) {
            return ApiResponse.badRequest(bindingResult);
        }

        EmployeeSalary salary = salaryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("salary-not-found"));

        double netSalary = (safe(dto.basicSalary()) + safe(dto.overtimeSalary()) + safe(dto.bonus()) + safe(dto.allowance()))
                - (safe(dto.insuranceDeduction()) + safe(dto.taxDeduction()));

        salary.setPayrollPeriod(dto.payrollPeriod());
        salary.setBasicSalary(dto.basicSalary());
        salary.setOvertimeSalary(dto.overtimeSalary());
        salary.setBonus(dto.bonus());
        salary.setAllowance(dto.allowance());
        salary.setInsuranceDeduction(dto.insuranceDeduction());
        salary.setTaxDeduction(dto.taxDeduction());
        salary.setNetSalary(netSalary);
        salary.setNote(dto.note());

        salaryRepository.save(salary);
        return ApiResponse.success(null, "salary-updated-successfully");
    }

    @Transactional
    public ApiResponse<?> deleteSalary(Long id) {
        return salaryRepository.findById(id).map(salary -> {
            salaryRepository.delete(salary);
            return ApiResponse.success(null, "salary-deleted-successfully");
        }).orElse(ApiResponse.notfound("salary-not-found"));
    }

    public ApiResponse<?> getSalariesByEmployee(Long employeeId) {
        List<EmployeeSalary> list = salaryRepository.findByEmployee_Id(employeeId);
        List<EmployeeSalaryResponseDTO> dtos = mapToResponseList(list);
        return ApiResponse.success(dtos, "fetch-salaries-by-employee");
    }

    public ApiResponse<?> getSalariesByEmployeeAndStatus(Long employeeId, String statusStr) {
        SalaryStatus status;
        try {
            status = SalaryStatus.valueOf(statusStr.toUpperCase());
        } catch (Exception e) {
            return ApiResponse.badRequest("invalid-status");
        }
        List<EmployeeSalary> list = salaryRepository.findByEmployee_IdAndStatus(employeeId, status);
        List<EmployeeSalaryResponseDTO> dtos = mapToResponseList(list);
        return ApiResponse.success(dtos, "fetch-salaries-by-employee-and-status");
    }

    private List<EmployeeSalaryResponseDTO> mapToResponseList(List<EmployeeSalary> list) {
        return list.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    private EmployeeSalaryResponseDTO mapToResponse(EmployeeSalary s) {
        String createdByDisplay = s.getCreatedBy() != null && s.getCreatedBy().getEmployee() != null
                ? s.getCreatedBy().getEmployee().getFirstName()
                + " " + s.getCreatedBy().getEmployee().getLastName()
                + " (" + s.getCreatedBy().getEmployee().getEmail() + ")"
                : s.getCreatedBy() != null
                ? s.getCreatedBy().getUsername()
                : null;

        return new EmployeeSalaryResponseDTO(
                s.getId(),
                s.getEmployee().getId(),
                s.getEmployee().getFirstName() + " " + s.getEmployee().getLastName(),
                s.getPayrollPeriod(),
                s.getBasicSalary(),
                s.getOvertimeSalary(),
                s.getBonus(),
                s.getAllowance(),
                s.getInsuranceDeduction(),
                s.getTaxDeduction(),
                s.getNetSalary(),
                s.getStatus(),
                s.getNote(),
                createdByDisplay,
                s.getCreatedAt()
        );
    }

    private double safe(Double v) {
        return v != null ? v : 0.0;
    }
}
