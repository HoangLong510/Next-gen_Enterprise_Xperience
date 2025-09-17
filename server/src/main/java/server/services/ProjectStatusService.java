package server.services;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import server.models.*;
import server.models.enums.DocumentStatus;
import server.models.enums.TaskStatus;
import server.models.enums.PhaseStatus;
import server.models.enums.ProjectStatus;
import server.repositories.AccountRepository;
import server.repositories.DocumentRepository;
import server.repositories.PhaseRepository;
import server.repositories.ProjectRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProjectStatusService {

    private final ProjectRepository projectRepository;
    private final PhaseRepository phaseRepository;
    private final DocumentRepository documentRepository;
    private final AccountRepository accountRepository;
    private final NotificationService notificationService;

    /**
     * Cập nhật status của các phase và project dựa trên các task.
     */
    @Transactional
    public void refreshStatus(Project project) {
        var phases = project.getPhases() == null ? List.<Phase>of() : project.getPhases();

        // 1) Cập nhật trạng thái Phase dựa vào task
        for (Phase phase : phases) {
            var tasks = phase.getTasks() == null ? List.<Task>of() : phase.getTasks();
            var activeTasks = tasks.stream()
                    .filter(t -> t.getStatus() != TaskStatus.CANCELED)
                    .toList();

            if (activeTasks.isEmpty()) {
                // Không có task active -> giữ nguyên trạng thái hiện tại
                continue;
            }

            boolean allDone = activeTasks.stream().allMatch(t -> t.getStatus() == TaskStatus.COMPLETED);

            // Nếu tất cả task active đều COMPLETED -> phase COMPLETED
            // Ngược lại -> phase IN_PROGRESS (kể cả trước đó phase đang COMPLETED)
            if (allDone) {
                if (phase.getStatus() != PhaseStatus.COMPLETED) {
                    phase.setStatus(PhaseStatus.COMPLETED);
                    phaseRepository.save(phase);
                }
            } else {
                if (phase.getStatus() != PhaseStatus.IN_PROGRESS) {
                    phase.setStatus(PhaseStatus.IN_PROGRESS);
                    phaseRepository.save(phase);
                }
            }
        }

        // 2) Cập nhật trạng thái Project
        ProjectStatus oldStatus = project.getStatus();

        boolean anyPhaseInProgress = phases.stream()
                .anyMatch(p -> p.getStatus() == PhaseStatus.IN_PROGRESS);

        // Từ PLANNING → IN_PROGRESS khi có ít nhất một phase IN_PROGRESS
        if (oldStatus == ProjectStatus.PLANNING && anyPhaseInProgress) {
            project.setStatus(ProjectStatus.IN_PROGRESS);
            if (project.isHidden()) project.setHidden(false); // đề phòng bị ẩn trước đó
            projectRepository.save(project);
            return;
        }

        boolean allPhasesCompleted = !phases.isEmpty()
                && phases.stream().allMatch(p -> p.getStatus() == PhaseStatus.COMPLETED);

        long totalActiveTasks = phases.stream()
                .flatMap(p -> (p.getTasks() == null ? List.<Task>of().stream() : p.getTasks().stream()))
                .filter(t -> t.getStatus() != TaskStatus.CANCELED)
                .count();

        if (allPhasesCompleted && totalActiveTasks > 0 && oldStatus != ProjectStatus.COMPLETED) {
            project.setStatus(ProjectStatus.COMPLETED);
            project.setCompletedAt(LocalDateTime.now()); // cập nhật mốc hoàn tất mới
            projectRepository.save(project);

            Account actor = null;
            var auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null) {
                actor = accountRepository.findByUsername(auth.getName()).orElse(null);
            }

            notificationService.notifyProjectCompleted(project, actor);
            return;
        }

        // Nếu rời COMPLETED do reopen bằng PUT, giữ completedAt theo policy
        if (project.getStatus() != ProjectStatus.COMPLETED && project.isHidden()) {
            project.setHidden(false);
            projectRepository.save(project);
        }
    }

}
