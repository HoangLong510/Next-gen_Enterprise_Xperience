package server.controllers.accountant.fund;

import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import server.dtos.accountant.fund.*;
import server.services.accountant.fund.FundService;
import server.utils.ApiResponse;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/accountant/funds")
@RequiredArgsConstructor
public class FundController {

    private final FundService fundService;

    @PostMapping
    public ResponseEntity<ApiResponse<?>> createFund(
            @RequestBody FundRequestDTO request,
            Authentication authentication,
            BindingResult bindingResult
    ) {
        ApiResponse<?> response = fundService.createFund(request, authentication, bindingResult);
        return ResponseEntity.status(response.getStatus()).body(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<?>> updateFund(
            @PathVariable Long id,
            @RequestBody FundRequestDTO request,
            Authentication authentication,
            BindingResult bindingResult
    ) {
        ApiResponse<?> response = fundService.updateFund(id, request, authentication, bindingResult);
        return ResponseEntity.status(response.getStatus()).body(response);
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<?>> updateStatus(
            @PathVariable Long id,
            @RequestBody FundStatusUpdateRequest request,
            Authentication authentication,
            BindingResult bindingResult
    ) {
        ApiResponse<?> response = fundService.updateFundStatus(id, request, authentication, bindingResult);
        return ResponseEntity.status(response.getStatus()).body(response);
    }

    @GetMapping
    public ApiResponse<?> getFunds(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) LocalDateTime createdAfter,
            @RequestParam(required = false) LocalDateTime createdBefore,
            @RequestParam(required = false) Double balanceMin,
            @RequestParam(required = false) Double balanceMax,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return fundService.getFunds(name, status, createdAfter, createdBefore, balanceMin, balanceMax, page, size);
    }

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<?>> getFundSummary() {
        ApiResponse<?> response = fundService.getFundSummary();
        return ResponseEntity.status(response.getStatus()).body(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<?>> getFundById(@PathVariable Long id) {
        ApiResponse<?> response = fundService.getFundById(id);
        return ResponseEntity.status(response.getStatus()).body(response);
    }

    @PatchMapping("/{id}/lock")
    public ResponseEntity<ApiResponse<?>> lockFund(
            @PathVariable Long id,
            @RequestParam("reason") String reason,
            @RequestParam(value = "file", required = false) MultipartFile file,
            Authentication authentication
    ) {
        ApiResponse<?> response = fundService.lockFund(
                id,
                reason,
                file,
                authentication
        );
        return ResponseEntity.status(response.getStatus()).body(response);
    }

    @PatchMapping("/{id}/unlock")
    public ResponseEntity<ApiResponse<?>> unlockFund(
            @PathVariable Long id,
            @RequestParam("reason") String reason,
            @RequestParam(value = "file", required = false) MultipartFile file,
            Authentication authentication
    ) {
        ApiResponse<?> response = fundService.unlockFund(
                id,
                reason,
                file,
                authentication
        );
        return ResponseEntity.status(response.getStatus()).body(response);
    }

}
