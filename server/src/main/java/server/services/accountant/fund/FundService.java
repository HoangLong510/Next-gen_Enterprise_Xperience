package server.services.accountant.fund;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.validation.BindingResult;
import server.dtos.accountant.fund.FundLockRequestDTO;
import server.dtos.accountant.fund.FundRequestDTO;
import server.dtos.accountant.fund.FundResponseDTO;
import server.dtos.accountant.fund.FundSummaryDTO;
import server.models.Account;
import server.models.Employee;
import server.models.accountant.fund.Fund;
import server.models.accountant.fund.FundBackup;
import server.models.enums.TransactionStatus;
import server.repositories.accountant.fund.FundBackupRepository;
import server.repositories.accountant.fund.FundRepository;
import server.repositories.accountant.fund.FundSpecification;
import server.repositories.accountant.fund.FundTransactionRepository;
import server.utils.ApiResponse;

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
    private final FundTransactionRepository fundTransactionRepository;
    private final FundBackupRepository fundBackupRepository;


    public ApiResponse<?> createFund(
            FundRequestDTO request,
            Authentication authentication,
            BindingResult bindingResult
    ) {
        if (!StringUtils.hasText(request.getName())) {
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

        int nextYear = LocalDateTime.now().getYear() + 1;
        fund.setLockedUntil(LocalDateTime.of(nextYear, 3, 31, 0, 0));

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
        }
        if (!StringUtils.hasText(request.getName())) {
            bindingResult.rejectValue("name", "", "fund-name-is-required");
        }
        if (request.getBalance() == null || request.getBalance() < 0) {
            bindingResult.rejectValue("balance", "", "fund-balance-must-be-non-negative");
        }
        if (bindingResult.hasErrors()) {
            return ApiResponse.badRequest(bindingResult);
        }
        long transactionCount = fundTransactionRepository.countByFundId(fund.getId());
        if (transactionCount > 0) {
            FundBackup backup = FundBackup.builder()
                    .originalFundId(fund.getId())
                    .name(fund.getName())
                    .balance(fund.getBalance())
                    .purpose(fund.getPurpose())
                    .backedUpAt(LocalDateTime.now())
                    .updatedByAccount((Account) authentication.getPrincipal())
                    .build();

            fundBackupRepository.save(backup);
        }

        fund.setName(request.getName());
        fund.setBalance(request.getBalance());
        fund.setPurpose(request.getPurpose());
        fund.setUpdatedBy((Account) authentication.getPrincipal());

        Fund updated = fundRepository.save(fund);
        return ApiResponse.success(toResponse(updated), "fund-updated-successfully");
    }

    public ApiResponse<?> getFundEditHistory(Long fundId) {
        List<FundBackup> backups = fundBackupRepository.findByOriginalFundIdOrderByBackedUpAtDesc(fundId);

        List<Map<String, Object>> history = backups.stream().map(b -> {
            Map<String, Object> entry = new HashMap<>();
            entry.put("name", b.getName());
            entry.put("balance", b.getBalance());
            entry.put("purpose", b.getPurpose());
            entry.put("backedUpAt", b.getBackedUpAt());
            Account updater = b.getUpdatedByAccount();
            entry.put("updatedBy", updater != null ? buildDisplayName(updater) : "Không có dữ liệu");
            return entry;
        }).collect(Collectors.toList());

        return ApiResponse.success(history, "fund-edit-history-fetched-successfully");
    }

    public ApiResponse<?> getFundById(Long id) {
        Fund fund = fundRepository.findById(id).orElse(null);
        if (fund == null) {
            return ApiResponse.notfound("fund-not-found");
        }
        return ApiResponse.success(toResponse(fund), "fund-fetched-successfully");
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
        Double totalBalance = fundRepository.getTotalBalance();
        if (totalBalance == null) totalBalance = 0.0;

        long transactionCount = fundTransactionRepository.count();
        Double totalIncreased = fundTransactionRepository.getTotalIncreased();
        if (totalIncreased == null) totalIncreased = 0.0;

        Double totalDecreased = fundTransactionRepository.getTotalDecreased();
        if (totalDecreased == null) totalDecreased = 0.0;

        long totalPending = fundTransactionRepository.countFundTransactionsByStatus(TransactionStatus.PENDING);

        FundSummaryDTO dto = new FundSummaryDTO(
                totalFunds,
                totalBalance,
                totalPending,
                transactionCount,
                totalIncreased,
                totalDecreased,
                null,
                null,
                null
        );

        return ApiResponse.success(dto, "fund-summary-fetched-successfully");
    }

    public ApiResponse<?> lockFund(Long fundId, FundLockRequestDTO request, BindingResult bindingResult) {
        Fund fund = fundRepository.findById(fundId).orElse(null);
        if (fund == null) {
            return ApiResponse.notfound("fund-not-found");
        }

        if (request.getLockDate() == null || request.getLockDate().isBlank()) {
            bindingResult.rejectValue("lockDate", "", "lock-date-is-required");
            return ApiResponse.badRequest(bindingResult);
        }

        // Parse lock date
        LocalDateTime lockDateTime;
        try {
            lockDateTime = parseFutureLockDate(request.getLockDate());
        } catch (Exception e) {
            bindingResult.rejectValue("lockDate", "", "invalid-lock-date-format");
            return ApiResponse.badRequest(bindingResult);
        }

        fund.setLockedUntil(lockDateTime);
        fund.setStatus("LOCKED");
        fundRepository.save(fund);

        return ApiResponse.success(null, "fund-locked-successfully");
    }

    private LocalDateTime parseFutureLockDate(String dayMonth) {
        String[] parts = dayMonth.split("-");
        if (parts.length != 2) {
            throw new IllegalArgumentException("Invalid date format");
        }
        int day = Integer.parseInt(parts[0]);
        int month = Integer.parseInt(parts[1]);

        LocalDateTime now = LocalDateTime.now();
        int year = now.getYear();
        LocalDateTime targetDate = LocalDateTime.of(year, month, day, 0, 0);

        if (targetDate.isBefore(now)) {
            targetDate = targetDate.plusYears(1);
        }
        return targetDate;
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
            return !fullName.isBlank() ? fullName : account.getUsername();
        }
        return account.getUsername();
    }

    private String buildAvatarUrl(Account account) {
        if (account != null && account.getEmployee() != null) {
            return account.getEmployee().getAvatar();
        }
        return null;
    }

    private FundResponseDTO toResponse(Fund fund) {
        String createdByDisplay = buildDisplayName(fund.getCreatedBy());
        String updatedByDisplay = buildDisplayName(fund.getUpdatedBy());
        String createdByAvatar = buildAvatarUrl(fund.getCreatedBy());
        String updatedByAvatar = buildAvatarUrl(fund.getUpdatedBy());

        String lockDateStr = null;
        if (fund.getLockedUntil() != null) {
            lockDateStr = fund.getLockedUntil().toLocalDate()
                    .format(java.time.format.DateTimeFormatter.ofPattern("dd-MM-yyyy"));
        }

        return new FundResponseDTO(
                fund.getId(),
                fund.getName(),
                fund.getBalance(),
                fund.getStatus(),
                fund.getPurpose(),
                createdByDisplay,
                updatedByDisplay,
                createdByAvatar,
                updatedByAvatar,
                fund.getCreatedAt(),
                fund.getUpdatedAt(),
                lockDateStr
        );
    }
}
