package server.controllers.accountant.fund;

import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import server.services.accountant.fund.FundStatusLogService;
import server.utils.ApiResponse;

import java.time.LocalDate;

@RestController
@RequestMapping("/accountant/funds/{fundId}/logs")
@RequiredArgsConstructor
public class FundStatusLogController {

    private final FundStatusLogService logService;

    @GetMapping
    public ResponseEntity<ApiResponse<?>> getLogs(
            @PathVariable Long fundId,
            @RequestParam(required = false) String updatedBy,
            @RequestParam(required = false) String newStatus, // thêm newStatus
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate
    ) {
        ApiResponse<?> response = logService.getLogsByFund(fundId, updatedBy, newStatus, fromDate, toDate);
        return ResponseEntity.status(response.getStatus()).body(response);
    }



    @GetMapping("/{logId}")
    public ResponseEntity<ApiResponse<?>> getLogById(@PathVariable Long logId) {
        ApiResponse<?> response = logService.getLogById(logId);
        return ResponseEntity.status(response.getStatus()).body(response);
    }
}
