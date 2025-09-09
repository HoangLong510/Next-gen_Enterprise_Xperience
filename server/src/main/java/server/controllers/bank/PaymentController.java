package server.controllers.bank;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import server.dtos.bank.BankTxFilter;

import server.dtos.bank.CreateTopupRequest;
import server.models.Account;
import server.models.enums.bank.BankTxType;
import server.repositories.bank.BankTransactionRepository;
import server.services.bank.TopupService;
import server.utils.ApiResponse;

import java.time.LocalDateTime;

@RestController
@RequestMapping("")
@RequiredArgsConstructor
public class PaymentController {

    private final TopupService topupService;
    private final BankTransactionRepository bankTxRepo;

    // Tạo topup (đơn lẻ hoặc bulk theo DTO)
    @PostMapping("/payments/topups/bulk")
    public ResponseEntity<?> createTopupMulti(Authentication auth,
                                              @RequestBody CreateTopupRequest req) {
        Account me = (Account) auth.getPrincipal();

        // perEmployee = true  => tạo 1 mã cho mỗi nhân viên
        if (Boolean.TRUE.equals(req.getPerEmployee())) {
            return ResponseEntity.ok(topupService.createTopupIntentPerEmployee(me, req));
        }

        // perEmployee = false => tạo nhiều bản cho một người (employeeId hoặc me)
        return ResponseEntity.ok(topupService.createTopupIntentCopies(me, req));
    }

    // Lịch sử topup của chính user
    @GetMapping("/payments/topups")
    public ApiResponse<?> getTopups(
            @AuthenticationPrincipal Account me,
            @RequestParam(required = false) String scope, // "created" | "owner" | null
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return topupService.getTopups(me, scope, page, size);
    }

    // Check trạng thái theo code
    @GetMapping("/payments/topups/status/{code}")
    public ResponseEntity<?> topupStatus(@PathVariable String code) {
        return ResponseEntity.ok(topupService.getStatusByCode(code));
    }

    // (Admin/KT) – Lịch sử giao dịch ngân hàng
    @GetMapping("/accountant/bank-transactions")
    public ResponseEntity<?> listBankTx(BankTxFilter f) {
        var from = f.getFrom() == null ? LocalDateTime.now().minusDays(7) : f.getFrom();
        var to   = f.getTo()   == null ? LocalDateTime.now().plusDays(1) : f.getTo();
        var page = PageRequest.of(Math.max(f.getPage()-1,0), Math.min(f.getSize(), 200));

        if (f.getType() == null || f.getType().isBlank()) {
            return ResponseEntity.ok(
                    bankTxRepo.findByTxTimeBetweenOrderByTxTimeDesc(from, to, page)
            );
        }
        var type = "DEBIT".equalsIgnoreCase(f.getType()) ? BankTxType.DEBIT : BankTxType.CREDIT;
        return ResponseEntity.ok(
                bankTxRepo.findByAccountNoAndTypeAndTxTimeBetweenOrderByTxTimeDesc(
                        null, type, from, to, page) // hoặc nếu không lọc account thì:
                // bankTxRepo.findByTypeAndTxTimeBetweenOrderByTxTimeDesc(type, from, to, page)
        );
    }


    // Lấy QR VietQR cho mã nạp
    @GetMapping("/payments/topups/{code}/qr")
    public ResponseEntity<?> getTopupQr(@PathVariable String code) {
        return ResponseEntity.ok(topupService.getVietQrForTopup(code));
    }
}