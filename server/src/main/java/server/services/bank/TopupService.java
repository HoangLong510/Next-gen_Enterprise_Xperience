package server.services.bank;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import server.dtos.bank.CreateTopupRequest;
import server.dtos.bank.TopupBulkResponse;
import server.dtos.bank.TopupItemDTO;
import server.models.Account;
import server.models.bank.BankTransaction;
import server.models.bank.Topup;
import server.models.enums.Role;
import server.models.enums.bank.BankTxType;
import server.models.enums.bank.TopupStatus;
import server.repositories.AccountRepository;
import server.repositories.bank.BankTransactionRepository;
import server.repositories.bank.TopupRepository;
import server.utils.ApiResponse;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TopupService {

    private final TopupRepository topupRepo;
    private final BankTransactionRepository bankTxRepo;
    private final AccountRepository accountRepo;

    private String genCode() {
        return "NEX-" + UUID.randomUUID().toString().replace("-", "")
                .substring(0, 6).toUpperCase();
    }

    /* ===================== CREATE ===================== */

    /** Tạo 1 ý định nạp cho chính người gọi (owner = actor). */
    @Transactional
    public ApiResponse<?> createTopupIntent(Account actor, CreateTopupRequest req) {
        validateAmount(req.getAmount());

        Topup t = Topup.builder()
                .account(actor)                 // người tạo yêu cầu
                .owner(actor)                   // người sở hữu/nhận tiền
                .amount(req.getAmount())
                .bankAccountNo(req.getBankAccountNo())
                .code(genCode())
                .status(TopupStatus.PENDING)
                .build();
        topupRepo.save(t);

        return ApiResponse.success(toItem(t), "create-topup-intent-success");
    }

    /**
     * Chế độ bulk “all-in-one”:
     * - Nếu req.employeeIds có dữ liệu -> tạo 1 mã/nhân viên (owner = account của employee).
     * - Ngược lại -> tạo n bản sao cho chính người gọi (copies, owner = actor).
     */
    @Transactional
    public ApiResponse<?> createTopupIntentMulti(Account actor, CreateTopupRequest req, int copies) {
        validateAmount(req.getAmount());

        // 1) Một mã cho mỗi nhân viên
        if (req.getEmployeeIds() != null && !req.getEmployeeIds().isEmpty()) {
            List<Long> empIds = req.getEmployeeIds().stream().distinct().toList();

            // map employeeId -> account owner
            Map<Long, Account> ownerByEmpId = empIds.stream().collect(Collectors.toMap(
                    id -> id,
                    id -> accountRepo.findByEmployee_Id(id)
                            .orElseThrow(() -> new IllegalArgumentException("employee-not-found:" + id))
            ));

            List<TopupItemDTO> items = new ArrayList<>();
            for (Long empId : empIds) {
                Account owner = ownerByEmpId.get(empId);
                Topup t = Topup.builder()
                        .account(actor)
                        .owner(owner)                           // chủ sở hữu là nhân viên
                        .amount(req.getAmount())
                        .bankAccountNo(req.getBankAccountNo())
                        .code(genCode())
                        .status(TopupStatus.PENDING)
                        .build();
                topupRepo.save(t);
                items.add(toItem(t));
            }

            TopupBulkResponse payload = TopupBulkResponse.builder()
                    .mode("PER_EMPLOYEE")
                    .count(items.size())
                    .items(items)
                    .build();

            return ApiResponse.success(payload, "create-topup-per-employee-success");
        }

        // 2) N bản cho chính người gọi
        int n = Math.max(1, copies);
        List<TopupItemDTO> items = new ArrayList<>(n);

        for (int i = 0; i < n; i++) {
            Topup t = Topup.builder()
                    .account(actor)
                    .owner(actor)                               // chủ sở hữu là người gọi
                    .amount(req.getAmount())
                    .bankAccountNo(req.getBankAccountNo())
                    .code(genCode())
                    .status(TopupStatus.PENDING)
                    .build();
            topupRepo.save(t);
            items.add(toItem(t));
        }

        TopupBulkResponse payload = TopupBulkResponse.builder()
                .mode("COPIES_FOR_CALLER")
                .count(n)
                .items(items)
                .build();

        return ApiResponse.success(payload, "create-multi-topup-success");
    }

    /** Alias: luôn perEmployee=true, copies=1. */
    @Transactional
    public ApiResponse<?> createTopupIntentPerEmployee(Account actor, CreateTopupRequest req) {
        req.setPerEmployee(true);
        req.setCopies(1);
        return createTopupIntentMulti(actor, req, 1);
    }

    /** Alias: luôn perEmployee=false, copies>=1. */
    @Transactional
    public ApiResponse<?> createTopupIntentCopies(Account actor, CreateTopupRequest req) {
        req.setPerEmployee(false);
        int copies = (req.getCopies() == null || req.getCopies() < 1) ? 1 : req.getCopies();
        return createTopupIntentMulti(actor, req, copies);
    }

    /* ===================== QUERY ===================== */

    public ApiResponse<?> getTopups(Account me, String scope, int page, int size) {
        boolean byOwner;
        if (scope == null || scope.isBlank()) {
            byOwner = (me.getRole() != Role.ACCOUNTANT);
        } else {
            byOwner = "owner".equalsIgnoreCase(scope);
        }

        PageRequest pr = PageRequest.of(Math.max(page - 1, 0), Math.min(size, 100));
        Page<Topup> p = byOwner
                ? topupRepo.findByOwner_IdOrderByIdDesc(me.getId(), pr)
                : topupRepo.findByAccount_IdOrderByIdDesc(me.getId(), pr);

        return ApiResponse.success(p.map(this::toItem), "get-topup-history-success");
    }

    /** Lấy trạng thái theo code. */
    public ApiResponse<?> getStatusByCode(String code) {
        if (code == null || code.isBlank()) return ApiResponse.badRequest("invalid-code");
        Topup t = topupRepo.findFirstByCodeIgnoreCaseOrderByIdDesc(code.trim()).orElse(null);
        if (t == null) return ApiResponse.notfound("topup-code-not-found");
        return ApiResponse.success(toItem(t), "get-topup-status-success");
    }

    /* ============= MATCH BY BANK TX (Webhook/Job) ============= */

    /** Match tự động theo ND CK (Credit only). */
    @Transactional
    public void matchTopupIfAny(BankTransaction tx) {
        if (tx == null || tx.getType() != BankTxType.CREDIT) return;
        String desc = tx.getDescription();
        if (desc == null || desc.isBlank()) return;

        String code = extractCodeFromText(desc);
        if (code == null) return;

        matchByCodeOnce(tx, code);
    }

    /** Ưu tiên code detect từ SePay, nếu không có thì fallback ND CK. */
    @Transactional
    public void matchTopupUsing(BankTransaction tx, String detectedCodeFromSepay) {
        if (tx == null || tx.getType() != BankTxType.CREDIT) return;

        if (detectedCodeFromSepay != null && !detectedCodeFromSepay.isBlank()) {
            matchByCodeOnce(tx, detectedCodeFromSepay.trim());
            return;
        }
        String desc = tx.getDescription();
        if (desc == null || desc.isBlank()) return;

        String code = extractCodeFromText(desc);
        if (code == null) return;

        matchByCodeOnce(tx, code);
    }

    /** Idempotent: đánh dấu thành công đúng 1 intent PENDING theo code. */
    private void matchByCodeOnce(BankTransaction tx, String codeRaw) {
        String code = codeRaw.trim();

        Topup t = topupRepo.findFirstByCodeIgnoreCaseAndStatusOrderByIdAsc(code, TopupStatus.PENDING)
                .orElse(null);
        if (t == null) return;

        markSuccess(t, tx);
    }

    private String extractCodeFromText(String text) {
        if (text == null) return null;
        String upper = text.toUpperCase();
        // Ưu tiên pattern NEX-xxxxxx (hoặc có _, space)
        var m = java.util.regex.Pattern
                .compile("(NEX[-_\\s]?)([A-Z0-9]{6,10})")
                .matcher(upper);
        if (m.find()) {
            return ("NEX-" + m.group(2)).toUpperCase();
        }
        // Fallback: gom chữ-số liên tục dài >= 6
        String cleaned = upper.replaceAll("[^A-Z0-9]", "");
        if (cleaned.length() >= 6) return cleaned;
        return null;
    }

    private void markSuccess(Topup t, BankTransaction tx) {
        Long amt = (tx.getAmount() != null && tx.getAmount() > 0) ? tx.getAmount() : null;
        LocalDateTime doneAt = tx.getTxTime() != null ? tx.getTxTime() : LocalDateTime.now();
        topupRepo.markSuccessIfPending(t.getId(), tx.getRefId(), doneAt, amt);

    }

    /* ===================== VIETQR ===================== */

    public ApiResponse<?> getVietQrForTopup(String code) {
        if (code == null || code.isBlank()) return ApiResponse.badRequest("invalid-code");
        var t = topupRepo.findFirstByCodeIgnoreCaseOrderByIdDesc(code.trim()).orElse(null);
        if (t == null) return ApiResponse.badRequest("topup-code-not-found");

        String bankShortCode = resolveBankShortCodeByAccount(t.getBankAccountNo());
        String accountName = "NEX WALLET";

        String base = "https://img.vietqr.io/image/"
                + bankShortCode + "-" + t.getBankAccountNo() + "-compact.png";

        Map<String, String> q = new LinkedHashMap<>();
        if (t.getAmount() != null && t.getAmount() > 0) q.put("amount", String.valueOf(t.getAmount()));
        q.put("addInfo", t.getCode());
        q.put("accountName", accountName);

        String query = q.entrySet().stream()
                .map(e -> e.getKey() + "=" + URLEncoder.encode(e.getValue(), StandardCharsets.UTF_8))
                .collect(Collectors.joining("&"));

        String qrImageUrl = base + "?" + query;

        return ApiResponse.success(Map.of(
                "code", t.getCode(),
                "amount", t.getAmount(),
                "bankAccountNo", t.getBankAccountNo(),
                "qrImageUrl", qrImageUrl
        ), "vietqr-image-url-generated");
    }

    private String resolveBankShortCodeByAccount(String accountNo) {
        return "tpbank";
    }

    /* ===================== HELPERS ===================== */

    private void validateAmount(Long amount) {
        if (amount == null || amount <= 0) {
            throw new IllegalArgumentException("invalid-amount");
        }
    }

    private TopupItemDTO toItem(Topup t) {
        if (t == null) return null;

        TopupItemDTO.OwnerDTO ownerDto = null;
        if (t.getOwner() != null && t.getOwner().getEmployee() != null) {
            var e = t.getOwner().getEmployee();
            ownerDto = TopupItemDTO.OwnerDTO.builder()
                    .accountId(t.getOwner().getId())
                    .employeeId(e.getId())
                    .firstName(e.getFirstName())
                    .lastName(e.getLastName())
                    .email(e.getEmail())
                    .phone(e.getPhone())
                    .avatar(e.getAvatar())
                    .build();
        } else if (t.getOwner() != null) {
            ownerDto = TopupItemDTO.OwnerDTO.builder()
                    .accountId(t.getOwner().getId())
                    .build();
        }

        return TopupItemDTO.builder()
                .id(t.getId())
                .code(t.getCode())
                .amount(t.getAmount())
                .bankAccountNo(t.getBankAccountNo())
                .status(t.getStatus() != null ? t.getStatus().name() : null)
                .sepayRefId(t.getSepayRefId())
                .completedAt(t.getCompletedAt())
                .createdAt(t.getCreatedAt())
                .owner(ownerDto)
                .build();
    }

}
