package server.services.accountant.fund;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import server.dtos.accountant.fund.log.FundStatusLogResponseDTO;
import server.models.accountant.fund.FundStatusLog;
import server.repositories.accountant.fund.FundStatusLogRepository;
import server.utils.ApiResponse;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FundStatusLogService {

    private final FundStatusLogRepository logRepository;

    public ApiResponse<?> getLogsByFund(Long fundId, String updatedBy, String newStatus, LocalDate fromDate, LocalDate toDate) {
        List<FundStatusLog> logs = logRepository.findByFundIdOrderByUpdatedAtDesc(fundId);

        if (logs.isEmpty()) {
            return ApiResponse.notfound("fund-logs-not-found");
        }

        // Lọc theo updatedBy
        if (updatedBy != null && !updatedBy.isBlank()) {
            logs = logs.stream()
                    .filter(log -> {
                        if (log.getUpdatedBy() == null || log.getUpdatedBy().getEmployee() == null) return false;
                        String fullName = log.getUpdatedBy().getEmployee().getFirstName() + " " +
                                log.getUpdatedBy().getEmployee().getLastName();
                        return fullName.toLowerCase().contains(updatedBy.toLowerCase());
                    })
                    .collect(Collectors.toList());
        }

        // Lọc theo newStatus
        if (newStatus != null && !newStatus.isBlank()) {
            logs = logs.stream()
                    .filter(log -> log.getNewStatus() != null && log.getNewStatus().equalsIgnoreCase(newStatus))
                    .collect(Collectors.toList());
        }

        // Lọc theo fromDate
        if (fromDate != null) {
            logs = logs.stream()
                    .filter(log -> log.getUpdatedAt() != null && !log.getUpdatedAt().toLocalDate().isBefore(fromDate))
                    .collect(Collectors.toList());
        }

        // Lọc theo toDate
        if (toDate != null) {
            logs = logs.stream()
                    .filter(log -> log.getUpdatedAt() != null && !log.getUpdatedAt().toLocalDate().isAfter(toDate))
                    .collect(Collectors.toList());
        }

        if (logs.isEmpty()) {
            return ApiResponse.notfound("fund-logs-not-found");
        }

        List<FundStatusLogResponseDTO> dtoList = logs.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());

        return ApiResponse.success(dtoList, "fund-logs-fetched-successfully");
    }



    public ApiResponse<?> getLogById(Long id) {
        return logRepository.findById(id)
                .map(log -> ApiResponse.success(toResponse(log), "fund-log-fetched-successfully"))
                .orElseGet(() -> ApiResponse.notfound("fund-log-not-found"));
    }

    public ApiResponse<?> getLogsByFundPaged(Long fundId, Pageable pageable) {
        Page<FundStatusLog> page = logRepository.findByFundId(fundId, pageable);

        if (page.isEmpty()) {
            return ApiResponse.notfound("fund-logs-not-found");
        }

        Page<FundStatusLogResponseDTO> dtoPage = page.map(this::toResponse);

        return ApiResponse.success(dtoPage, "fund-logs-fetched-successfully");
    }

    private FundStatusLogResponseDTO toResponse(FundStatusLog log) {
        return FundStatusLogResponseDTO.builder()
                .id(log.getId())
                .oldStatus(log.getOldStatus())
                .newStatus(log.getNewStatus())
                .reason(log.getReason())
                .fileName(log.getFileName())
                .fileUrl(log.getFileUrl())
                .updatedBy(
                        log.getUpdatedBy() != null && log.getUpdatedBy().getEmployee() != null
                                ? log.getUpdatedBy().getEmployee().getFirstName()
                                + " " + log.getUpdatedBy().getEmployee().getLastName()
                                + " (" + log.getUpdatedBy().getEmployee().getEmail() + ")"
                                : null
                )
                .updatedAt(log.getUpdatedAt())
                .build();
    }


}
