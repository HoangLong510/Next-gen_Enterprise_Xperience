package server.services.accountant.salary;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.BindingResult;
import server.dtos.accountant.salary.SalaryPaymentRequestDTO;
import server.dtos.accountant.salary.SalaryPaymentResponseDTO;
import server.models.Account;
import server.models.accountant.salary.EmployeeSalary;
import server.models.accountant.salary.SalaryPayment;
import server.models.enums.SalaryStatus;
import server.repositories.accountant.salary.EmployeeSalaryRepository;
import server.repositories.accountant.salary.SalaryPaymentRepository;
import server.services.UploadFileService;
import server.utils.ApiResponse;

import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SalaryPaymentService {

    private final EmployeeSalaryRepository salaryRepository;
    private final SalaryPaymentRepository paymentRepository;
    private final UploadFileService uploadFileService;

    @Transactional
    public ApiResponse<?> createPayment(Long salaryId, SalaryPaymentRequestDTO dto, BindingResult bindingResult, Account account) throws IOException {
        if (bindingResult.hasErrors()) {
            return ApiResponse.badRequest(bindingResult);
        }

        EmployeeSalary salary = salaryRepository.findById(salaryId)
                .orElseThrow(() -> new IllegalArgumentException("salary-not-found"));

        String filePath = null;
        if (dto.attachment() != null) {
            if (dto.attachment().isEmpty()) {
                return ApiResponse.badRequest("file-is-empty");
            }
            filePath = uploadFileService.storeImage("salary", dto.attachment())
                    .replace("\\", "/");
        }

        SalaryPayment payment = SalaryPayment.builder()
                .salary(salary)
                .amountPaid(dto.amountPaid())
                .paymentDate(dto.paymentDate())
                .paymentMethod(dto.paymentMethod())
                .note(dto.note())
                .attachmentUrl(filePath)
                .createdBy(account)
                .build();

        paymentRepository.save(payment);

        // Nếu đã trả đủ, cập nhật trạng thái
        Double totalPaid = paymentRepository.sumAmountBySalaryId(salaryId);
        if (totalPaid >= salary.getNetSalary() && salary.getStatus() != SalaryStatus.PAID) {
            salary.setStatus(SalaryStatus.PAID);
            salaryRepository.save(salary);
        }

        return ApiResponse.created(mapToResponse(payment), "payment-recorded");
    }

    public ApiResponse<?> getPayments(Long salaryId) {
        List<SalaryPayment> payments = paymentRepository.findBySalary_Id(salaryId);

        List<SalaryPaymentResponseDTO> dtos = payments.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        return ApiResponse.success(dtos, "fetch-payments-successfully");
    }

    public ApiResponse<?> getPayment(Long paymentId) {
        return paymentRepository.findById(paymentId)
                .map(p -> ApiResponse.success(mapToResponse(p), "fetch-payment-successfully"))
                .orElse(ApiResponse.notfound("payment-not-found"));
    }

    private SalaryPaymentResponseDTO mapToResponse(SalaryPayment p) {
        String createdByDisplay = p.getCreatedBy() != null && p.getCreatedBy().getEmployee() != null
                ? p.getCreatedBy().getEmployee().getFirstName()
                + " " + p.getCreatedBy().getEmployee().getLastName()
                + " (" + p.getCreatedBy().getEmployee().getEmail() + ")"
                : p.getCreatedBy() != null
                ? p.getCreatedBy().getUsername()
                : null;

        return new SalaryPaymentResponseDTO(
                p.getId(),
                p.getAmountPaid(),
                p.getPaymentDate(),
                p.getPaymentMethod(),
                p.getNote(),
                p.getAttachmentUrl(),
                createdByDisplay
        );
    }
}
