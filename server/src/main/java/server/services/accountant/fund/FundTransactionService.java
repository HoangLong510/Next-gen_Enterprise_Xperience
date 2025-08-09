package server.services.accountant.fund;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import server.dtos.accountant.fund.transaction.FundTransactionRequestDTO;
import server.dtos.accountant.fund.transaction.FundTransactionResponseDTO;
import server.models.Account;
import server.models.Employee;
import server.models.accountant.fund.Fund;
import server.models.accountant.fund.FundTransaction;
import server.models.enums.TransactionStatus;
import server.repositories.accountant.fund.FundRepository;
import server.repositories.accountant.fund.FundTransactionRepository;
import server.services.UploadFileService;
import server.utils.ApiResponse;

import java.io.IOException;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class FundTransactionService {

    private final FundRepository fundRepository;
    private final FundTransactionRepository transactionRepository;
    private final UploadFileService uploadFileService;

    public ApiResponse<?> createTransaction(
            Long fundId,
            FundTransactionRequestDTO request,
            MultipartFile file,
            Authentication authentication
    ) {
        Fund fund = fundRepository.findById(fundId).orElse(null);
        if (fund == null) {
            return ApiResponse.badRequest("fund-not-found");
        }

        if (request.getAmount() == null || request.getAmount() <= 0) {
            return ApiResponse.badRequest("transaction-amount-must-be-positive");
        }

        if (request.getType() == null ||
                (!request.getType().equalsIgnoreCase("INCREASE") && !request.getType().equalsIgnoreCase("DECREASE"))) {
            return ApiResponse.badRequest("invalid-transaction-type");
        }

        if ("DECREASE".equalsIgnoreCase(request.getType()) && fund.getBalance() < request.getAmount()) {
            return ApiResponse.badRequest("insufficient-fund-balance");
        }

        String fileUrl = null;
        if (file != null) {
            // Nếu có file, lưu file và lấy URL
            try {
                fileUrl = saveFileIfPresent(file);
            } catch (IOException e) {
                return ApiResponse.errorServer("failed-to-save-file: " + e.getMessage());
            }
        }


        FundTransaction transaction = new FundTransaction();
        transaction.setFund(fund);
        transaction.setType(request.getType().toUpperCase());
        transaction.setAmount(request.getAmount());
        transaction.setNote(request.getNote());
        transaction.setStatus(TransactionStatus.PENDING);
        transaction.setCreatedBy((Account) authentication.getPrincipal());
        transaction.setFileUrl(fileUrl);

        FundTransaction saved = transactionRepository.save(transaction);

        return ApiResponse.created(toResponse(saved), "fund-transaction-created-successfully");
    }

    public ApiResponse<?> getTransactions(Long fundId) {
        List<FundTransactionResponseDTO> transactions = transactionRepository.findByFundIdOrderByCreatedAtDesc(fundId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());

        return ApiResponse.success(transactions, "fund-transactions-fetched-successfully");
    }

    public ApiResponse<?> approveTransaction(
            Long transactionId,
            boolean approve,
            String comment,
            Authentication authentication
    ) {
        FundTransaction transaction = transactionRepository.findById(transactionId).orElse(null);
        if (transaction == null) {
            return ApiResponse.badRequest("transaction-not-found");
        }

        if (transaction.getStatus() != TransactionStatus.PENDING) {
            return ApiResponse.badRequest("transaction-already-processed");
        }

        // Nếu duyệt, kiểm tra số dư quỹ
        if (approve && "DECREASE".equalsIgnoreCase(transaction.getType())) {
            Fund fund = transaction.getFund();
            if (fund.getBalance() < transaction.getAmount()) {
                return ApiResponse.badRequest("insufficient-fund-balance");
            }
        }

        transaction.setStatus(approve ? TransactionStatus.APPROVED : TransactionStatus.REJECTED);
        transaction.setApprovalComment(comment);
        transaction.setApprovedBy((Account) authentication.getPrincipal());
        transaction.setApprovedAt(LocalDateTime.now());

        if (approve) {
            Fund fund = transaction.getFund();
            if ("INCREASE".equalsIgnoreCase(transaction.getType())) {
                fund.setBalance(fund.getBalance() + transaction.getAmount());
            } else {
                fund.setBalance(fund.getBalance() - transaction.getAmount());
            }
            fundRepository.save(fund);
        }

        FundTransaction updated = transactionRepository.save(transaction);

        return ApiResponse.success(toResponse(updated), "transaction-approved-successfully");
    }

    private String saveFileIfPresent(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            return null;
        }
        String fullPath = uploadFileService.storeFile("funds", file);
        String fileName = Paths.get(fullPath).getFileName().toString();
        return "/uploads/funds/" + fileName;
    }

    public ApiResponse<?> getAllTransactions(
            Long fundId,
            String type,
            String status,
            LocalDateTime createdFrom,
            LocalDateTime createdTo
    ) {
        Specification<FundTransaction> spec = null;

        if (fundId != null) {
            spec = (root, query, cb) ->
                    cb.equal(root.get("fund").get("id"), fundId);
        }

        if (type != null && !type.isBlank()) {
            Specification<FundTransaction> typeSpec = (root, query, cb) ->
                    cb.equal(cb.upper(root.get("type")), type.toUpperCase());
            spec = (spec == null) ? typeSpec : spec.and(typeSpec);
        }

        if (status != null && !status.isBlank()) {
            Specification<FundTransaction> statusSpec = (root, query, cb) ->
                    cb.equal(root.get("status"), TransactionStatus.valueOf(status));
            spec = (spec == null) ? statusSpec : spec.and(statusSpec);
        }

        if (createdFrom != null) {
            Specification<FundTransaction> createdFromSpec = (root, query, cb) ->
                    cb.greaterThanOrEqualTo(root.get("createdAt"), createdFrom);
            spec = (spec == null) ? createdFromSpec : spec.and(createdFromSpec);
        }

        if (createdTo != null) {
            Specification<FundTransaction> createdToSpec = (root, query, cb) ->
                    cb.lessThanOrEqualTo(root.get("createdAt"), createdTo);
            spec = (spec == null) ? createdToSpec : spec.and(createdToSpec);
        }

        List<FundTransactionResponseDTO> transactions;

        if (spec == null) {
            // Lấy tất cả records nếu không có filter
            transactions = transactionRepository
                    .findAll(Sort.by(Sort.Direction.DESC, "createdAt"))
                    .stream()
                    .map(this::toResponse)
                    .collect(Collectors.toList());
        } else {
            transactions = transactionRepository
                    .findAll(spec, Sort.by(Sort.Direction.DESC, "createdAt"))
                    .stream()
                    .map(this::toResponse)
                    .collect(Collectors.toList());
        }

        return ApiResponse.success(transactions, "all-transactions-fetched-successfully");
    }
    private String buildDisplayName(Account account) {
        if (account == null) return null;
        if (account.getEmployee() != null) {
            Employee emp = account.getEmployee();
            String firstName = emp.getFirstName() != null ? emp.getFirstName() : "";
            String lastName = emp.getLastName() != null ? emp.getLastName() : "";
            String fullName = (firstName + " " + lastName).trim();

            if (emp.getEmail() != null && !emp.getEmail().isBlank()) {
                return !fullName.isBlank()
                        ? fullName + " (" + emp.getEmail() + ")"
                        : emp.getEmail();
            }

            return !fullName.isBlank()
                    ? fullName
                    : account.getUsername();
        }
        return account.getUsername();
    }

    private String buildAvatarUrl(Account account) {
        if (account != null && account.getEmployee() != null) {
            return account.getEmployee().getAvatar();
        }
        return null;
    }
    private FundTransactionResponseDTO toResponse(FundTransaction t) {
        String createdByDisplay = buildDisplayName(t.getCreatedBy());
        String createdByAvatar = buildAvatarUrl(t.getCreatedBy());

        String approvedByDisplay = buildDisplayName(t.getApprovedBy());
        String approvedByAvatar = buildAvatarUrl(t.getApprovedBy());

        return new FundTransactionResponseDTO(
                t.getId(),
                t.getType(),
                t.getAmount(),
                t.getNote(),
                t.getCreatedBy() != null ? t.getCreatedBy().getUsername() : null,
                createdByDisplay,
                createdByAvatar,
                t.getCreatedAt(),
                t.getFileUrl(),
                t.getStatus() != null ? t.getStatus().name() : null,
                t.getApprovalComment(),
                t.getApprovedBy() != null ? t.getApprovedBy().getUsername() : null,
                approvedByDisplay,
                approvedByAvatar,
                t.getApprovedAt()
        );
    }



}
