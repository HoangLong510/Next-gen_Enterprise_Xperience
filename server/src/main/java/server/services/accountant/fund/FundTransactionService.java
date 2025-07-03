package server.services.accountant.fund;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.BindingResult;
import org.springframework.web.multipart.MultipartFile;
import server.dtos.accountant.fund.transaction.FundTransactionRequestDTO;
import server.dtos.accountant.fund.transaction.FundTransactionResponseDTO;
import server.models.Account;
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
            Authentication authentication,
            BindingResult bindingResult
    ) {
        Fund fund = fundRepository.findById(fundId).orElse(null);
        if (fund == null) {
            bindingResult.rejectValue("fundId", "", "fund-not-found");
            return ApiResponse.badRequest(bindingResult);
        }

        if (request.getAmount() == null || request.getAmount() <= 0) {
            bindingResult.rejectValue("amount", "", "transaction-amount-must-be-positive");
        }

        if (request.getType() == null ||
                (!request.getType().equalsIgnoreCase("INCREASE") && !request.getType().equalsIgnoreCase("DECREASE"))) {
            bindingResult.rejectValue("type", "", "invalid-transaction-type");
        }

        if ("DECREASE".equalsIgnoreCase(request.getType()) && fund.getBalance() < request.getAmount()) {
            bindingResult.rejectValue("amount", "", "insufficient-fund-balance");
        }

        if (bindingResult.hasErrors()) {
            return ApiResponse.badRequest(bindingResult);
        }

        String fileUrl = null;
        try {
            fileUrl = saveFileIfPresent(file);
        } catch (IOException e) {
            return ApiResponse.errorServer("failed-to-save-file: " + e.getMessage());
        }

        if ("INCREASE".equalsIgnoreCase(request.getType())) {
            fund.setBalance(fund.getBalance() + request.getAmount());
        } else {
            fund.setBalance(fund.getBalance() - request.getAmount());
        }

        FundTransaction transaction = new FundTransaction();
        transaction.setFund(fund);
        transaction.setType(request.getType().toUpperCase());
        transaction.setAmount(request.getAmount());
        transaction.setNote(request.getNote());
        transaction.setCreatedBy((Account) authentication.getPrincipal());
        transaction.setFileUrl(fileUrl);

        fundRepository.save(fund);
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
            Authentication authentication,
            BindingResult bindingResult
    ) {
        FundTransaction transaction = transactionRepository.findById(transactionId).orElse(null);
        if (transaction == null) {
            bindingResult.rejectValue("transactionId", "", "transaction-not-found");
            return ApiResponse.badRequest(bindingResult);
        }

        if (transaction.getStatus() != TransactionStatus.PENDING) {
            bindingResult.rejectValue("status", "", "transaction-already-processed");
            return ApiResponse.badRequest(bindingResult);
        }

        // Nếu duyệt, kiểm tra số dư quỹ
        if (approve && "DECREASE".equalsIgnoreCase(transaction.getType())) {
            Fund fund = transaction.getFund();
            if (fund.getBalance() < transaction.getAmount()) {
                bindingResult.rejectValue("amount", "", "insufficient-fund-balance");
                return ApiResponse.badRequest(bindingResult);
            }
        }

        if (bindingResult.hasErrors()) {
            return ApiResponse.badRequest(bindingResult);
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
        String fullPath = uploadFileService.storeImage("funds", file);
        String fileName = Paths.get(fullPath).getFileName().toString();
        return "/uploads/funds/" + fileName;
    }

    private FundTransactionResponseDTO toResponse(FundTransaction t) {
        return new FundTransactionResponseDTO(
                t.getId(),
                t.getType(),
                t.getAmount(),
                t.getNote(),
                t.getCreatedBy() != null ? t.getCreatedBy().getUsername() : null,
                t.getCreatedAt(),
                t.getFileUrl() != null ? Paths.get(t.getFileUrl()).getFileName().toString() : null,
                t.getFileUrl(),
                t.getStatus() != null ? t.getStatus().name() : null,
                t.getApprovalComment(),
                t.getApprovedBy() != null ? t.getApprovedBy().getUsername() : null,
                t.getApprovedAt()
        );
    }
}
