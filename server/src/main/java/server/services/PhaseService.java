// src/main/java/server/services/PhaseService.java
package server.services;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import server.dtos.CreatePhaseDto;
import server.dtos.PhaseDto;
import server.dtos.TaskDto;
import server.dtos.UpdatePhaseDto;
import server.models.Account;
import server.models.Phase;
import server.models.Task;
import server.models.enums.PhaseStatus;
import server.models.enums.TaskStatus;
import server.repositories.AccountRepository;
import server.repositories.PhaseRepository;
import server.repositories.ProjectRepository;
import server.utils.ApiResponse;
import server.utils.JwtUtil;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PhaseService {

    private final PhaseRepository phaseRepository;
    private final ProjectRepository projectRepository;

    private final JwtUtil jwtUtil;
    private final AccountRepository accountRepository;

    // ================== CREATE ==================
    @Transactional
    public ApiResponse<PhaseDto> createPhase(Long projectId, CreatePhaseDto dto) {
        var projectOpt = projectRepository.findById(projectId);
        if (projectOpt.isEmpty()) return ApiResponse.notfound("project-not-found");

        var project = projectOpt.get();

        Integer maxSeq = phaseRepository.findMaxSequenceByProject(project.getId());
        int newSeq = (maxSeq == null ? 0 : maxSeq) + 1;

<<<<<<< Updated upstream
        // phase sau phải có deadline >= phase trước
        if (newSeq > 1) {
            var prevOpt = phaseRepository.findByProjectIdAndSequence(project.getId(), newSeq - 1);
            if (prevOpt.isPresent()) {
                var prev = prevOpt.get();
                if (dto.getDeadline().isBefore(prev.getDeadline())) {
                    return ApiResponse.badRequest("deadline-before-previous-phase");
                }
            }
=======
        // >= deadline phase trước (nếu có)
        if (newSeq > 1) {
            phaseRepository.findByProjectIdAndSequence(project.getId(), newSeq - 1)
                    .ifPresent(prev -> {
                        if (dto.getDeadline().isBefore(prev.getDeadline())) {
                            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "deadline-before-previous-phase");
                        }
                    });
>>>>>>> Stashed changes
        }

        // <= deadline project (nếu có)
        if (project.getDeadline() != null && dto.getDeadline().isAfter(project.getDeadline())) {
            return ApiResponse.badRequest("deadline-after-project-deadline");
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

    // ================== READ ==================
    public ApiResponse<List<PhaseDto>> getPhasesByProject(Long projectId) {
        var phases = phaseRepository.findByProjectIdOrderBySequence(projectId);
        var dtos = phases.stream().map(this::toDto).toList();
        return ApiResponse.success(dtos, "phases-list");
    }

    public ApiResponse<List<PhaseDto>> getPhasesWithTasksByProject(Long projectId, HttpServletRequest request) {
        var phases = phaseRepository.findByProjectIdWithTasksOrderBySequence(projectId);

        String username = jwtUtil.extractUsernameFromRequest(request);
        Account me = accountRepository.findByUsername(username).orElse(null);

        if (me == null) {
            var fallback = phases.stream().map(this::toDtoWithTasks).toList();
            return ApiResponse.success(fallback, "phases-list-with-tasks");
        }

        boolean isStaff = me.getRole() != null &&
                (me.getRole().name().equals("EMPLOYEE") || me.getRole().name().equals("HOD"));

        List<PhaseDto> dtos = new ArrayList<>();

        for (Phase ph : phases) {
            List<Task> all = (ph.getTasks() == null) ? List.of() : ph.getTasks();

            if (!isStaff) {
                dtos.add(toDtoWithTasks(ph, all));
            } else {
                List<Task> visible = all.stream()
                        .filter(t -> t != null
                                && t.getAssignee() != null
                                && (
                                t.getAssignee().getId().equals(me.getId())
                                        || (t.getAssignee().getAccount() != null
                                        && username.equals(t.getAssignee().getAccount().getUsername()))
                        )
                                && t.getStatus() != TaskStatus.CANCELED)
                        .toList();

                dtos.add(toDtoWithTasks(ph, visible));
            }
        }

        return ApiResponse.success(dtos, "phases-list-with-tasks");
    }

    public ApiResponse<PhaseDto> getPhaseById(Long phaseId) {
        return phaseRepository.findById(phaseId)
                .map(phase -> ApiResponse.success(toDto(phase), "get-phase-success"))
                .orElse(ApiResponse.notfound("phase-not-found"));
    }

    // ================== STATE TRANSITIONS ==================
    public ApiResponse<?> startPhase(Long phaseId) {
        var phaseOpt = phaseRepository.findById(phaseId);
        if (phaseOpt.isEmpty()) return ApiResponse.notfound("phase-not-found");

        Phase phase = phaseOpt.get();
        if (phase.getStatus() != PhaseStatus.PLANNING) {
            return ApiResponse.badRequest("phase-already-started-or-completed");
        }

        List<Phase> phases = phaseRepository.findByProjectIdOrderBySequence(phase.getProject().getId());
        for (Phase p : phases) {
            if (p.getSequence() >= phase.getSequence()) break;
            if (p.getStatus() != PhaseStatus.COMPLETED) {
                return ApiResponse.badRequest("previous-phase-not-completed");
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
            return ApiResponse.badRequest("phase-not-in-progress");
        }

        phase.setStatus(PhaseStatus.COMPLETED);
        phaseRepository.save(phase);

        return ApiResponse.success(null, "phase-completed");
    }

<<<<<<< Updated upstream
    // ====== Helper cho @PreAuthorize trong PhaseController ======
    // PM của project theo projectId?
=======
    // ================== PERMISSION HELPERS ==================
>>>>>>> Stashed changes
    public boolean isProjectManager(Long projectId, String username) {
        return projectRepository.findById(projectId)
                .map(p -> {
                    Account pm = p.getProjectManager();
                    return pm != null && username.equals(pm.getUsername());
                })
                .orElse(false);
    }

    public boolean isProjectManagerOfPhase(Long phaseId, String username) {
        return phaseRepository.findById(phaseId)
                .map(ph -> {
                    Account pm = ph.getProject().getProjectManager();
                    return pm != null && username.equals(pm.getUsername());
                })
                .orElse(false);
    }

<<<<<<< Updated upstream
=======
    // ================== UPDATE ==================
>>>>>>> Stashed changes
    @Transactional
    public ApiResponse<PhaseDto> updatePhase(Long id, UpdatePhaseDto dto) {
        var phaseOpt = phaseRepository.findById(id);
        if (phaseOpt.isEmpty()) return ApiResponse.notfound("phase-not-found");

        Phase phase = phaseOpt.get();

        // ==== Update name / deadline ====
        if (dto.getName() != null) {
            phase.setName(dto.getName());
        }

        if (dto.getDeadline() != null) {
            var project = phase.getProject();

            // >= deadline phase trước
            if (phase.getSequence() > 1) {
<<<<<<< Updated upstream
                var prevOpt = phaseRepository.findByProjectIdAndSequence(project.getId(), phase.getSequence() - 1);
                if (prevOpt.isPresent()) {
                    var prev = prevOpt.get();
                    if (dto.getDeadline().isBefore(prev.getDeadline())) {
                        return ApiResponse.badRequest("deadline-before-previous-phase");
                    }
                }
=======
                phaseRepository.findByProjectIdAndSequence(project.getId(), phase.getSequence() - 1)
                        .ifPresent(prev -> {
                            if (dto.getDeadline().isBefore(prev.getDeadline())) {
                                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "deadline-before-previous-phase");
                            }
                        });
>>>>>>> Stashed changes
            }

            // ⭐ NEW: <= deadline phase kế tiếp (nếu có)
            phaseRepository.findByProjectIdAndSequence(project.getId(), phase.getSequence() + 1)
                    .ifPresent(next -> {
                        if (next.getDeadline() != null && dto.getDeadline().isAfter(next.getDeadline())) {
                            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "deadline-after-next-phase-deadline");
                        }
                    });

            // <= deadline project
            if (project.getDeadline() != null && dto.getDeadline().isAfter(project.getDeadline())) {
<<<<<<< Updated upstream
                return ApiResponse.badRequest("deadline-after-project-deadline");
=======
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "deadline-after-project-deadline");
>>>>>>> Stashed changes
            }

            phase.setDeadline(dto.getDeadline());
        }

        // ==== Validate & update status ====
        if (dto.getStatus() != null) {
            PhaseStatus current = phase.getStatus();
            PhaseStatus target  = dto.getStatus();

            boolean hasTasks = phase.getTasks() != null && !phase.getTasks().isEmpty();

<<<<<<< Updated upstream
            // ⭐ COMPLETED -> IN_PROGRESS (chỉ khi còn deadline & phase sau đang PLANNING và chưa có task)
=======
            // COMPLETED -> IN_PROGRESS: chỉ khi deadline chưa quá hạn & phase sau đang PLANNING và chưa có task
>>>>>>> Stashed changes
            if (current == PhaseStatus.COMPLETED && target == PhaseStatus.IN_PROGRESS) {
                if (phase.getDeadline() != null && phase.getDeadline().isBefore(LocalDate.now())) {
                    return ApiResponse.badRequest("phase-deadline-passed");
                }
                var nextOpt = phaseRepository.findByProjectIdAndSequence(
                        phase.getProject().getId(), phase.getSequence() + 1
                );
                if (nextOpt.isPresent()) {
                    var next = nextOpt.get();
                    boolean nextHasTasks = next.getTasks() != null && !next.getTasks().isEmpty();
                    if (next.getStatus() != PhaseStatus.PLANNING || nextHasTasks) {
                        return ApiResponse.badRequest("cannot-reopen-completed-when-next-not-planning-or-has-tasks");
                    }
                }
            }

<<<<<<< Updated upstream
            // ⭐ CANCELED -> IN_PROGRESS (chỉ khi phase sau đang PLANNING và chưa có task)
=======
            // CANCELED -> IN_PROGRESS: chỉ khi phase sau đang PLANNING và chưa có task
>>>>>>> Stashed changes
            if (current == PhaseStatus.CANCELED && target == PhaseStatus.IN_PROGRESS) {
                var nextOpt = phaseRepository.findByProjectIdAndSequence(
                        phase.getProject().getId(), phase.getSequence() + 1
                );
                if (nextOpt.isPresent()) {
                    var next = nextOpt.get();
                    boolean nextHasTasks = next.getTasks() != null && !next.getTasks().isEmpty();
                    if (next.getStatus() != PhaseStatus.PLANNING || nextHasTasks) {
                        return ApiResponse.badRequest("cannot-reopen-canceled-phase-when-next-not-planning-or-has-tasks");
                    }
                }
            }

            // Các rule hiện hữu
            if (current == PhaseStatus.PLANNING) {
                if (target == PhaseStatus.IN_PROGRESS && !hasTasks) {
<<<<<<< Updated upstream
                    return ApiResponse.badRequest("cannot-start-phase-without-tasks");
=======
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "cannot-start-phase-without-tasks");
>>>>>>> Stashed changes
                } else if (target == PhaseStatus.CANCELED
                        || target == PhaseStatus.PLANNING
                        || target == PhaseStatus.IN_PROGRESS) {
                    // ok
                } else {
<<<<<<< Updated upstream
                    return ApiResponse.badRequest("invalid-status-transition-from-planning");
=======
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid-status-transition-from-planning");
>>>>>>> Stashed changes
                }
            } else if (current == PhaseStatus.CANCELED) {
                if (hasTasks) {
                    if (target != PhaseStatus.IN_PROGRESS && target != PhaseStatus.CANCELED) {
<<<<<<< Updated upstream
                        return ApiResponse.badRequest("canceled-with-tasks-only-to-in-progress");
                    }
                } else {
                    if (target != PhaseStatus.PLANNING && target != PhaseStatus.CANCELED) {
                        return ApiResponse.badRequest("canceled-without-tasks-only-to-planning");
=======
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "canceled-with-tasks-only-to-in-progress");
                    }
                } else {
                    if (target != PhaseStatus.PLANNING && target != PhaseStatus.CANCELED) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "canceled-without-tasks-only-to-planning");
>>>>>>> Stashed changes
                    }
                }
            } else if (current == PhaseStatus.IN_PROGRESS) {
                if (target == PhaseStatus.PLANNING && hasTasks) {
<<<<<<< Updated upstream
                    return ApiResponse.badRequest("cannot-move-in-progress-to-planning-when-has-tasks");
=======
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "cannot-move-in-progress-to-planning-when-has-tasks");
>>>>>>> Stashed changes
                }
                // cho -> CANCELED, -> COMPLETED
            } else if (current == PhaseStatus.COMPLETED) {
                if (target != PhaseStatus.IN_PROGRESS && target != PhaseStatus.COMPLETED) {
<<<<<<< Updated upstream
                    return ApiResponse.badRequest("completed-can-only-go-to-in-progress");
=======
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "completed-can-only-go-to-in-progress");
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
    // ================== Mapping helpers ==================
=======
    // ================== DTO HELPERS ==================
>>>>>>> Stashed changes
    private PhaseDto toDto(Phase phase) {
        PhaseDto dto = new PhaseDto();
        dto.setId(phase.getId());
        dto.setName(phase.getName());
        dto.setDeadline(phase.getDeadline());
        dto.setStatus(phase.getStatus().name());
        dto.setSequence(phase.getSequence());
        dto.setStartedAt(phase.getStartedAt());
        dto.setProjectId(phase.getProject().getId());
        dto.setDisplayName("Phase " + phase.getSequence() + ": " + phase.getName());
        return dto;
    }

    private TaskDto mapTask(Task task) {
        TaskDto t = new TaskDto();
        t.setId(task.getId());
        t.setName(task.getName());
        t.setStatus(task.getStatus().name());
        t.setDeadline(task.getDeadline());
        t.setDescription(task.getDescription());
        t.setSize(task.getSize() != null ? task.getSize().name() : null);
        t.setPhaseId(task.getPhase() != null ? task.getPhase().getId() : null);

        if (task.getAssignee() != null) {
            var a = task.getAssignee();
            t.setAssigneeId(a.getId());
            t.setAssigneeName((a.getFirstName() + " " + a.getLastName()).trim());
            t.setAssigneeUsername(a.getAccount() != null ? a.getAccount().getUsername() : null);
        }
        return t;
    }

    private PhaseDto toDtoWithTasks(Phase phase) {
        List<Task> tasks = (phase.getTasks() == null) ? List.of() : phase.getTasks();
        return toDtoWithTasks(phase, tasks);
    }

    private PhaseDto toDtoWithTasks(Phase phase, List<Task> tasks) {
        PhaseDto dto = toDto(phase);

<<<<<<< Updated upstream
        List<TaskDto> taskDtos = (phase.getTasks() == null)
                ? List.of()
                : phase.getTasks().stream().map(this::mapTask).toList();
=======
        List<TaskDto> taskDtos = tasks.stream().map(task -> {
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
                t.setAssigneeUsername(a.getAccount() != null ? a.getAccount().getUsername() : null);
            }
            return t;
        }).toList();
>>>>>>> Stashed changes

        dto.setTasks(taskDtos);

        long total = tasks.stream()
                .filter(t -> t.getStatus() != TaskStatus.CANCELED)
                .count();

        long done = tasks.stream()
                .filter(t -> t.getStatus() != TaskStatus.CANCELED)
                .filter(t -> t.getStatus() == TaskStatus.COMPLETED)
                .count();

        int progress = (total == 0) ? 0 : (int) Math.round(done * 100.0 / total);
        dto.setProgress(progress);

        return dto;
    }
}
