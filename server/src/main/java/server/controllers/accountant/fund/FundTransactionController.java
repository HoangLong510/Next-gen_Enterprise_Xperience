package server.controllers.accountant.fund;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import server.dtos.accountant.fund.transaction.FundTransactionRequestDTO;
import server.services.accountant.fund.FundTransactionService;
import server.utils.ApiResponse;

@RestController
@RequestMapping("/accountant/funds/{fundId}/transactions")
@RequiredArgsConstructor
public class FundTransactionController {

    private final FundTransactionService transactionService;

    @PostMapping
    public ResponseEntity<ApiResponse<?>> createTransaction(
            @PathVariable Long fundId,
            @ModelAttribute FundTransactionRequestDTO request,
            @RequestParam(value = "file", required = false) MultipartFile file,
            Authentication authentication,
            BindingResult bindingResult
    ) {
        ApiResponse<?> response = transactionService.createTransaction(fundId, request, file, authentication, bindingResult);
        return ResponseEntity.status(response.getStatus()).body(response);
    }

    @GetMapping
    public ResponseEntity<ApiResponse<?>> getTransactions(@PathVariable Long fundId) {
        ApiResponse<?> response = transactionService.getTransactions(fundId);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{transactionId}/approval")
    public ResponseEntity<ApiResponse<?>> approveTransaction(
            @PathVariable Long transactionId,
            @RequestParam boolean approve,
            @RequestParam(required = false) String comment,
            Authentication authentication,
            BindingResult bindingResult
    ) {
        ApiResponse<?> response = transactionService.approveTransaction(
                transactionId,
                approve,
                comment,
                authentication,
                bindingResult
        );
        return ResponseEntity.status(response.getStatus()).body(response);
    }
}
