package server.controllers.accountant.fund;

import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import server.dtos.accountant.fund.transaction.FundTransactionRequestDTO;
import server.services.accountant.fund.FundTransactionService;
import server.utils.ApiResponse;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/accountant/funds")
@RequiredArgsConstructor
public class FundTransactionController {

    private final FundTransactionService transactionService;

    @PostMapping("/{fundId}/transactions")
    public ResponseEntity<ApiResponse<?>> createTransaction(
            @PathVariable Long fundId,
            @ModelAttribute FundTransactionRequestDTO request,
            @RequestParam(value = "file", required = false) MultipartFile file,
            Authentication authentication
    ) {
        ApiResponse<?> response = transactionService.createTransaction(
                fundId, request, file, authentication
        );
        return ResponseEntity.status(response.getStatus()).body(response);
    }



    @GetMapping("/{fundId}/transactions")
    public ResponseEntity<ApiResponse<?>> getTransactions(@PathVariable Long fundId) {
        ApiResponse<?> response = transactionService.getTransactions(fundId);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{fundId}/transactions/{transactionId}/approval")
    public ResponseEntity<ApiResponse<?>> approveTransaction(
            @PathVariable Long transactionId,
            @RequestParam boolean approve,
            @RequestParam(required = false) String comment,
            Authentication authentication
    ) {
        ApiResponse<?> response = transactionService.approveTransaction(
                transactionId,
                approve,
                comment,
                authentication
        );
        return ResponseEntity.status(response.getStatus()).body(response);
    }


    @GetMapping("/transactions")
    public ResponseEntity<ApiResponse<?>> getAllTransactions(
            @RequestParam(required = false) Long fundId,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String status,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime createdFrom,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime createdTo
    ) {
        ApiResponse<?> response = transactionService.getAllTransactions(
                fundId, type, status, createdFrom, createdTo
        );
        return ResponseEntity.ok(response);
    }
}
