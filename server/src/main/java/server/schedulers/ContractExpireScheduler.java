package server.schedulers;

import server.services.ContractService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ContractExpireScheduler {
    private final ContractService contractService;

    // Chạy 00:05 mỗi ngày (giờ VN). Đổi cron/zone tuỳ nhu cầu.
    @Scheduled(cron = "0 5 0 * * *", zone = "Asia/Ho_Chi_Minh")
    public void expireOverdue() {
        contractService.expireOverdueToday();
    }
}
