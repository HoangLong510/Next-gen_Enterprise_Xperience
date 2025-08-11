package server.services;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import server.dtos.CreatePhaseDto;
import server.dtos.PhaseDto;
import server.dtos.TaskDto;
import server.dtos.UpdatePhaseDto;
import server.models.Account;
import server.models.Phase;
import server.models.enums.PhaseStatus;
import server.models.enums.TaskStatus;
import server.repositories.PhaseRepository;
import server.repositories.ProjectRepository;
import server.utils.ApiResponse;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PhaseService {

    private final PhaseRepository phaseRepository;
    private final ProjectRepository projectRepository;

    @Transactional
    public ApiResponse<PhaseDto> createPhase(Long projectId, CreatePhaseDto dto) {
        var projectOpt = projectRepository.findById(projectId);
        if (projectOpt.isEmpty()) {
            return ApiResponse.notfound("project-not-found");
        }
        var project = projectOpt.get();

        Integer maxSeq = phaseRepository.findMaxSequenceByProject(project.getId());
        int newSeq = (maxSeq == null ? 0 : maxSeq) + 1;

        // phase sau phải >= phase trước
        if (newSeq > 1) {
            phaseRepository.findByProjectIdAndSequence(project.getId(), newSeq - 1)
                    .ifPresent(prev -> {
                        if (dto.getDeadline().isBefore(prev.getDeadline())) {
                            throw new ResponseStatusException(
                                    HttpStatus.BAD_REQUEST,
                                    "deadline-before-previous-phase"
                            );
                        }
                    });
        }

        // không vượt quá deadline project
        if (project.getDeadline() != null && dto.getDeadline().isAfter(project.getDeadline())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "deadline-after-project-deadline");
        }

        Phase phase = new Phase();
        phase.setName(dto.getName());
        phase.setDeadline(dto.getDeadline());
        phase.setSequence(newSeq);
        phase.setProject(project);
        phase.setStatus(PhaseStatus.PLANNING);

        Phase saved = phaseRepository.save(phase);

        PhaseDto result = new PhaseDto();
        result.setId(saved.getId());
        result.setName(saved.getName());
        result.setDeadline(saved.getDeadline());
        result.setSequence(saved.getSequence());
        result.setStatus(saved.getStatus().name());
        return ApiResponse.success(result, "phase-created-successfully");
    }

    public ApiResponse<List<PhaseDto>> getPhasesByProject(Long projectId) {
        var phases = phaseRepository.findByProjectIdOrderBySequence(projectId);
        var dtos = phases.stream().map(this::toDto).toList();
        return ApiResponse.success(dtos, "phases-list");
    }

    public ApiResponse<List<PhaseDto>> getPhasesWithTasksByProject(Long projectId) {
        var phases = phaseRepository.findByProjectIdWithTasksOrderBySequence(projectId);
        var dtos = phases.stream().map(this::toDtoWithTasks).toList();
        return ApiResponse.success(dtos, "phases-list-with-tasks");
    }

    public ApiResponse<PhaseDto> getPhaseById(Long phaseId) {
        return phaseRepository.findById(phaseId)
                .map(phase -> ApiResponse.success(toDto(phase), "get-phase-success"))
                .orElse(ApiResponse.notfound("phase-not-found"));
    }

    public ApiResponse<?> startPhase(Long phaseId) {
        var phaseOpt = phaseRepository.findById(phaseId);
        if (phaseOpt.isEmpty()) return ApiResponse.notfound("phase-not-found");

        Phase phase = phaseOpt.get();
        if (phase.getStatus() != PhaseStatus.PLANNING) {
            return ApiResponse.errorServer("phase-already-started-or-completed");
        }

        // tất cả phase trước phải completed
        List<Phase> phases = phaseRepository.findByProjectIdOrderBySequence(phase.getProject().getId());
        for (Phase p : phases) {
            if (p.getSequence() >= phase.getSequence()) break;
            if (p.getStatus() != PhaseStatus.COMPLETED) {
                return ApiResponse.errorServer("previous-phase-not-completed");
            }
        }

        phase.setStatus(PhaseStatus.IN_PROGRESS);
        phase.setStartedAt(LocalDateTime.now());
        phaseRepository.save(phase);

        return ApiResponse.success(null, "phase-started");
    }

    public ApiResponse<?> completePhase(Long phaseId) {
        var phaseOpt = phaseRepository.findById(phaseId);
        if (phaseOpt.isEmpty()) return ApiResponse.notfound("phase-not-found");

        Phase phase = phaseOpt.get();
        if (phase.getStatus() != PhaseStatus.IN_PROGRESS) {
            return ApiResponse.errorServer("phase-not-in-progress");
        }

        phase.setStatus(PhaseStatus.COMPLETED);
        phaseRepository.save(phase);

        return ApiResponse.success(null, "phase-completed");
    }
    // ====== Helper cho @PreAuthorize trong PhaseController ======
    // PM của project theo projectId?
    public boolean isProjectManager(Long projectId, String username) {
        return projectRepository.findById(projectId)
                .map(p -> {
                    Account pm = p.getProjectManager();     // <-- Account
                    return pm != null && username.equals(pm.getUsername());
                })
                .orElse(false);
    }

    // PM của project chứa phase theo phaseId?
    public boolean isProjectManagerOfPhase(Long phaseId, String username) {
        return phaseRepository.findById(phaseId)
                .map(ph -> {
                    Account pm = ph.getProject().getProjectManager();  // <-- Account
                    return pm != null && username.equals(pm.getUsername());
                })
                .orElse(false);
    }
    @Transactional
    public ApiResponse<PhaseDto> updatePhase(Long id, UpdatePhaseDto dto) {
        var phaseOpt = phaseRepository.findById(id);
        if (phaseOpt.isEmpty()) {
            return ApiResponse.notfound("phase-not-found");
        }
        Phase phase = phaseOpt.get();

        // ==== Update name / deadline (nếu có) ====
        if (dto.getName() != null) {
            phase.setName(dto.getName());
        }

        if (dto.getDeadline() != null) {
            var project = phase.getProject();

            // không nhỏ hơn deadline phase trước
            if (phase.getSequence() > 1) {
                phaseRepository.findByProjectIdAndSequence(project.getId(), phase.getSequence() - 1)
                        .ifPresent(prev -> {
                            if (dto.getDeadline().isBefore(prev.getDeadline())) {
                                throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "deadline-before-previous-phase"
                                );
                            }
                        });
            }

            // không vượt quá deadline project
            if (project.getDeadline() != null && dto.getDeadline().isAfter(project.getDeadline())) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "deadline-after-project-deadline"
                );
            }

            phase.setDeadline(dto.getDeadline());
        }

        // ==== Validate & update status (nếu có) ====
        if (dto.getStatus() != null) {
            PhaseStatus current = phase.getStatus();
            PhaseStatus target  = dto.getStatus();

            boolean hasTasks = phase.getTasks() != null && !phase.getTasks().isEmpty();

            // ⭐ Rule 1: COMPLETED -> IN_PROGRESS chỉ khi còn deadline & phase sau đang PLANNING và chưa có task
            if (current == PhaseStatus.COMPLETED && target == PhaseStatus.IN_PROGRESS) {
                if (phase.getDeadline() != null && phase.getDeadline().isBefore(LocalDate.now())) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "phase-deadline-passed");
                }
                var nextOpt = phaseRepository.findByProjectIdAndSequence(
                        phase.getProject().getId(), phase.getSequence() + 1
                );
                if (nextOpt.isPresent()) {
                    var next = nextOpt.get();
                    boolean nextHasTasks = next.getTasks() != null && !next.getTasks().isEmpty();
                    if (next.getStatus() != PhaseStatus.PLANNING || nextHasTasks) {
                        throw new ResponseStatusException(
                                HttpStatus.BAD_REQUEST,
                                "cannot-reopen-completed-when-next-not-planning-or-has-tasks"
                        );
                    }
                }
            }

            // ⭐ Rule 2: CANCELED -> IN_PROGRESS chỉ khi phase sau đang PLANNING và chưa có task
            if (current == PhaseStatus.CANCELED && target == PhaseStatus.IN_PROGRESS) {
                var nextOpt = phaseRepository.findByProjectIdAndSequence(
                        phase.getProject().getId(), phase.getSequence() + 1
                );
                if (nextOpt.isPresent()) {
                    var next = nextOpt.get();
                    boolean nextHasTasks = next.getTasks() != null && !next.getTasks().isEmpty();
                    if (next.getStatus() != PhaseStatus.PLANNING || nextHasTasks) {
                        throw new ResponseStatusException(
                                HttpStatus.BAD_REQUEST,
                                "cannot-reopen-canceled-phase-when-next-not-planning-or-has-tasks"
                        );
                    }
                }
                // (tuỳ chọn) cũng có thể yêu cầu còn deadline:
                // if (phase.getDeadline() != null && phase.getDeadline().isBefore(LocalDate.now())) {
                //     throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "phase-deadline-passed");
                // }
            }

            // Các rule hiện hữu
            if (current == PhaseStatus.PLANNING) {
                if (target == PhaseStatus.IN_PROGRESS && !hasTasks) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "cannot-start-phase-without-tasks");
                } else if (target == PhaseStatus.CANCELED
                        || target == PhaseStatus.PLANNING
                        || target == PhaseStatus.IN_PROGRESS) {
                    // ok
                } else {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "invalid-status-transition-from-planning");
                }
            } else if (current == PhaseStatus.CANCELED) {
                if (hasTasks) {
                    if (target != PhaseStatus.IN_PROGRESS && target != PhaseStatus.CANCELED) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                                "canceled-with-tasks-only-to-in-progress");
                    }
                } else {
                    if (target != PhaseStatus.PLANNING && target != PhaseStatus.CANCELED) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                                "canceled-without-tasks-only-to-planning");
                    }
                }
            } else if (current == PhaseStatus.IN_PROGRESS) {
                if (target == PhaseStatus.PLANNING && hasTasks) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "cannot-move-in-progress-to-planning-when-has-tasks");
                }
                // cho -> CANCELED, -> COMPLETED (COMPLETED đã check ở ngoài nếu cần)
            } else if (current == PhaseStatus.COMPLETED) {
                if (target != PhaseStatus.IN_PROGRESS && target != PhaseStatus.COMPLETED) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "completed-can-only-go-to-in-progress");
                }
            }

            phase.setStatus(target);

            if (target == PhaseStatus.IN_PROGRESS && phase.getStartedAt() == null) {
                phase.setStartedAt(LocalDateTime.now());
            }
        }

        Phase saved = phaseRepository.save(phase);
        return ApiResponse.success(toDto(saved), "phase-updated-successfully");
    }

    private PhaseDto toDto(Phase phase) {
        PhaseDto dto = new PhaseDto();
        dto.setId(phase.getId());
        dto.setName(phase.getName());
        dto.setDeadline(phase.getDeadline());
        dto.setStatus(phase.getStatus().name());
        dto.setSequence(phase.getSequence());
        dto.setDisplayName("Phase " + phase.getSequence() + ": " + phase.getName());
        dto.setStartedAt(phase.getStartedAt());
        dto.setProjectId(phase.getProject().getId());
        return dto;
    }

    private PhaseDto toDtoWithTasks(Phase phase) {
        PhaseDto dto = toDto(phase);

        List<TaskDto> taskDtos = (phase.getTasks() == null) ? List.of()
                : phase.getTasks().stream().map(task -> {
            TaskDto t = new TaskDto();
            t.setId(task.getId());
            t.setName(task.getName());
            t.setStatus(task.getStatus().name());
            t.setDeadline(task.getDeadline());
            t.setDescription(task.getDescription());
            t.setSize(task.getSize() != null ? task.getSize().name() : null);

            if (task.getAssignee() != null) {
                var a = task.getAssignee();
                t.setAssigneeId(a.getId());
                t.setAssigneeName((a.getFirstName() + " " + a.getLastName()).trim());
                t.setAssigneeUsername(
                        a.getAccount() != null ? a.getAccount().getUsername() : null
                );
            }
            return t;
        }).toList();

        dto.setTasks(taskDtos);

        long total = (phase.getTasks() == null) ? 0
                : phase.getTasks().stream()
                .filter(t -> t.getStatus() != TaskStatus.CANCELED)
                .count();

        long done = (phase.getTasks() == null) ? 0
                : phase.getTasks().stream()
                .filter(t -> t.getStatus() != TaskStatus.CANCELED)
                .filter(t -> t.getStatus() == TaskStatus.COMPLETED)
                .count();

        int progress = (total == 0) ? 0 : (int) Math.round(done * 100.0 / total);
        dto.setProgress(progress);

        return dto;
    }
}
