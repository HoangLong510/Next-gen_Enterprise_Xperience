// server/controllers/bank/BankController.java
package server.controllers.bank;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import server.dtos.bank.BankSnapshotDto;
import server.dtos.bank.BankTransactionDto;
import server.services.bank.BankMaintenanceService;
import server.services.bank.BankQueryService;
import server.utils.ApiResponse;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/accountant/bank")
@RequiredArgsConstructor
public class BankController {

    private final BankQueryService bankQueryService;
    private final BankMaintenanceService bankMaintenanceService;

    // Số dư hiện tại
    @GetMapping("/snapshot")
    public ApiResponse<BankSnapshotDto> snapshot() {
        return ApiResponse.success(bankQueryService.getSnapshot(), "bank-snapshot");
    }

    // Lịch sử giao dịch
    @GetMapping("/history")
    public ApiResponse<Page<BankTransactionDto>> history(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        var p = bankQueryService.getHistory(fromDate, toDate, page, size);
        return ApiResponse.success(p, "bank-history");
    }

    public record BankOverviewDto(BankSnapshotDto snapshot, List<BankTransactionDto> transactions) {}

    @PostMapping("/refresh")
    public ApiResponse<BankSnapshotDto> refresh() {
        bankMaintenanceService.resyncFundBalanceFromLatestTx();
        return ApiResponse.success(bankQueryService.getSnapshot(), "bank-refreshed");
    }
}
