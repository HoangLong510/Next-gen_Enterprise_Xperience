package server.schedulers;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import server.services.SubTaskService;

@Component
@RequiredArgsConstructor
public class PollingScheduler {

    private final SubTaskService subTaskService;

    /**
     * Chạy polling mỗi 5 phút để kiểm tra PR đã merge.
     */
    @Scheduled(fixedRate = 5*60000) // mỗi 5 phút
    public void runPolling() {
        System.out.println("🔄 Đang kiểm tra các SubTask REVIEW...");
        subTaskService.checkMergedPullRequests();
    }
}