package server.services.accountant.fund;

import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.BindingResult;
import org.springframework.web.multipart.MultipartFile;
import server.dtos.accountant.fund.*;
import server.models.Account;
import server.models.accountant.fund.Fund;
import server.models.accountant.fund.FundStatusLog;
import server.repositories.accountant.fund.FundRepository;
import server.repositories.accountant.fund.FundSpecification;
import server.repositories.accountant.fund.FundStatusLogRepository;
import server.repositories.accountant.fund.FundTransactionRepository;
import server.services.UploadFileService;
import server.utils.ApiResponse;

import java.io.IOException;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class FundService {

    private final FundRepository fundRepository;
    private final FundStatusLogRepository fundStatusLogRepository;
    private final FundTransactionRepository fundTransactionRepository;
    private final UploadFileService uploadFileService;

    public ApiResponse<?> createFund(
            FundRequestDTO request,
            Authentication authentication,
            BindingResult bindingResult
    ) {
        if (request.getName() == null || request.getName().trim().isEmpty()) {
            bindingResult.rejectValue("name", "", "fund-name-is-required");
        }
        if (request.getBalance() == null || request.getBalance() < 0) {
            bindingResult.rejectValue("balance", "", "fund-balance-must-be-non-negative");
        }
        if (bindingResult.hasErrors()) {
            return ApiResponse.badRequest(bindingResult);
        }

        Account account = (Account) authentication.getPrincipal();

        Fund fund = new Fund();
        fund.setName(request.getName());
        fund.setBalance(request.getBalance());
        fund.setPurpose(request.getPurpose());
        fund.setStatus("ACTIVE");
        fund.setCreatedBy(account);
        fund.setUpdatedBy(account);

        Fund saved = fundRepository.save(fund);
        return ApiResponse.created(toResponse(saved), "fund-created-successfully");
    }

    public ApiResponse<?> updateFund(
            Long id,
            FundRequestDTO request,
            Authentication authentication,
            BindingResult bindingResult
    ) {
        Fund fund = fundRepository.findById(id).orElse(null);
        if (fund == null) {
            bindingResult.rejectValue("id", "", "fund-not-found");
            return ApiResponse.badRequest(bindingResult);
        }

        fund.setName(request.getName());
        fund.setBalance(request.getBalance());
        fund.setPurpose(request.getPurpose());
        fund.setUpdatedBy((Account) authentication.getPrincipal());

        Fund updated = fundRepository.save(fund);
        return ApiResponse.success(toResponse(updated), "fund-updated-successfully");
    }

    public ApiResponse<?> getFundById(Long id) {
        Fund fund = fundRepository.findById(id).orElse(null);
        if (fund == null) {
            return ApiResponse.notfound("fund-not-found");
        }
        return ApiResponse.success(toResponse(fund), "fund-fetched-successfully");
    }

    public ApiResponse<?> updateFundStatus(
            Long fundId,
            FundStatusUpdateRequest request,
            Authentication authentication,
            BindingResult bindingResult
    ) {
        Fund fund = fundRepository.findById(fundId).orElse(null);
        if (fund == null) {
            bindingResult.rejectValue("fundId", "", "fund-not-found");
        }
        if (request.getNewStatus() == null || request.getNewStatus().trim().isEmpty()) {
            bindingResult.rejectValue("newStatus", "", "new-status-is-required");
        }
        if (bindingResult.hasErrors()) {
            return ApiResponse.badRequest(bindingResult);
        }

        Account account = (Account) authentication.getPrincipal();

        FundStatusLog log = new FundStatusLog();
        log.setFund(fund);
        log.setOldStatus(fund.getStatus());
        log.setNewStatus(request.getNewStatus());
        log.setReason(request.getReason());
        log.setFileName(request.getFileName());
        log.setFileUrl(request.getFileUrl());
        log.setUpdatedBy(account);
        fundStatusLogRepository.save(log);

        fund.setStatus(request.getNewStatus());
        Fund updated = fundRepository.save(fund);

        return ApiResponse.success(toResponse(updated), "fund-status-updated-successfully");
    }

    public ApiResponse<?> lockFund(
            Long fundId,
            String reason,
            MultipartFile file,
            Authentication authentication
    ) {
        if (reason == null || reason.trim().isEmpty()) {
            return ApiResponse.badRequest("reason-is-required");
        }
        return changeFundStatus(fundId, "LOCKED", reason, file, authentication);
    }

    public ApiResponse<?> unlockFund(
            Long fundId,
            String reason,
            MultipartFile file,
            Authentication authentication
    ) {
        if (reason == null || reason.trim().isEmpty()) {
            return ApiResponse.badRequest("reason-is-required");
        }
        return changeFundStatus(fundId, "ACTIVE", reason, file, authentication);
    }

    private ApiResponse<?> changeFundStatus(
            Long fundId,
            String newStatus,
            String reason,
            MultipartFile file,
            Authentication authentication
    ) {
        Fund fund = fundRepository.findById(fundId).orElse(null);
        if (fund == null) {
            return ApiResponse.notfound("fund-not-found");
        }

        String fileUrl;
        try {
            fileUrl = saveFileIfPresent(file);
        } catch (Exception e) {
            return ApiResponse.errorServer("failed-to-save-file: " + e.getMessage());
        }

        Account account = (Account) authentication.getPrincipal();

        FundStatusLog log = new FundStatusLog();
        log.setFund(fund);
        log.setOldStatus(fund.getStatus());
        log.setNewStatus(newStatus);
        log.setReason(reason);
        log.setFileName(file != null ? file.getOriginalFilename() : null);
        log.setFileUrl(fileUrl);
        log.setUpdatedBy(account);
        fundStatusLogRepository.save(log);

        fund.setStatus(newStatus);
        Fund updated = fundRepository.save(fund);

        return ApiResponse.success(toResponse(updated), "fund-status-updated-successfully");
    }

    public ApiResponse<?> getFunds(
            String name,
            String status,
            LocalDateTime createdAfter,
            LocalDateTime createdBefore,
            Double balanceMin,
            Double balanceMax,
            int page,
            int size
    ) {
        Specification<Fund> spec = (root, query, cb) -> cb.conjunction();

        if (name != null) spec = spec.and(FundSpecification.hasName(name));
        if (status != null) spec = spec.and(FundSpecification.hasStatus(status));
        if (createdAfter != null) spec = spec.and(FundSpecification.createdAfter(createdAfter));
        if (createdBefore != null) spec = spec.and(FundSpecification.createdBefore(createdBefore));
        if (balanceMin != null) spec = spec.and(FundSpecification.balanceGreaterThan(balanceMin));
        if (balanceMax != null) spec = spec.and(FundSpecification.balanceLessThan(balanceMax));

        Pageable pageable = PageRequest.of(page, size);
        var pageResult = fundRepository.findAll(spec, pageable);

        var results = pageResult.getContent()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("items", results);
        response.put("currentPage", pageResult.getNumber());
        response.put("totalPages", pageResult.getTotalPages());
        response.put("totalItems", pageResult.getTotalElements());
        response.put("pageSize", pageResult.getSize());

        return ApiResponse.success(response, "funds-fetched-successfully");
    }


    public ApiResponse<?> getFundSummary() {
        long totalFunds = fundRepository.count();
        double totalBalance = fundRepository.findAll()
                .stream()
                .mapToDouble(Fund::getBalance)
                .sum();
        long activeFunds = fundRepository.countByStatus("ACTIVE");
        long lockedFunds = fundRepository.countByStatus("LOCKED");
        long totalExpenses = fundTransactionRepository.countByType("DECREASE");

        FundSummaryDTO dto = new FundSummaryDTO(
                totalFunds,
                totalBalance,
                totalExpenses,
                activeFunds,
                lockedFunds
        );
        return ApiResponse.success(dto, "fund-summary-fetched-successfully");
    }

    private String saveFileIfPresent(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            return null;
        }
        String fullPath = uploadFileService.storeImage("funds", file);
        String fileName = Paths.get(fullPath).getFileName().toString();
        return "/uploads/funds/" + fileName;
    }

    private FundResponseDTO toResponse(Fund fund) {
        return new FundResponseDTO(
                fund.getId(),
                fund.getName(),
                fund.getBalance(),
                fund.getStatus(),
                fund.getPurpose(),
                fund.getCreatedBy() != null ? fund.getCreatedBy().getUsername() : null,
                fund.getUpdatedBy() != null ? fund.getUpdatedBy().getUsername() : null,
                fund.getCreatedAt(),
                fund.getUpdatedAt()
        );
    }
}
