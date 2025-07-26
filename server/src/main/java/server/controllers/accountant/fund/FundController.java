package server.controllers.accountant.fund;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import server.dtos.accountant.fund.FundRequestDTO;
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
            @RequestBody @Valid FundRequestDTO request,
            BindingResult bindingResult,
            Authentication authentication

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


    @GetMapping
    public ResponseEntity<ApiResponse<?>> getFunds(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String status,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime createdAfter,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime createdBefore,
            @RequestParam(required = false) Double balanceMin,
            @RequestParam(required = false) Double balanceMax,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        ApiResponse<?> response = fundService.getFunds(name, status, createdAfter, createdBefore, balanceMin, balanceMax, page, size);
        return ResponseEntity.status(response.getStatus()).body(response);
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



}
