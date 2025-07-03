package server.controllers.accountant.salary;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import server.dtos.accountant.salary.SalaryPaymentRequestDTO;
import server.models.Account;
import server.services.accountant.salary.SalaryPaymentService;
import server.utils.ApiResponse;

import java.io.IOException;

@RestController
@RequestMapping("/accountant/salaries/{salaryId}/payments")
@RequiredArgsConstructor
public class SalaryPaymentController {

    private final SalaryPaymentService paymentService;

    @PostMapping
    public ResponseEntity<?> createPayment(
            @PathVariable Long salaryId,
            @Valid @ModelAttribute SalaryPaymentRequestDTO request,
            BindingResult bindingResult,
            @AuthenticationPrincipal Account account
    ) {
        try {
            ApiResponse<?> response = paymentService.createPayment(salaryId, request, bindingResult, account);
            return ResponseEntity.status(response.getStatus()).body(response);
        } catch (IOException e) {
            ApiResponse<?> error = ApiResponse.errorServer("file-upload-failed");
            return ResponseEntity.status(error.getStatus()).body(error);
        }
    }

    @GetMapping
    public ResponseEntity<?> listPayments(@PathVariable Long salaryId) {
        ApiResponse<?> response = paymentService.getPayments(salaryId);
        return ResponseEntity.status(response.getStatus()).body(response);
    }

    @GetMapping("/{paymentId}")
    public ResponseEntity<?> getPayment(@PathVariable Long salaryId, @PathVariable Long paymentId) {
        ApiResponse<?> response = paymentService.getPayment(paymentId);
        return ResponseEntity.status(response.getStatus()).body(response);
    }
}
