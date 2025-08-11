package server.services;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;
import server.dtos.CreateTaskDto;
import server.dtos.TaskDto;
import server.dtos.UpdateTaskDto;
import server.models.*;
import server.models.enums.*;
import server.repositories.*;
import server.utils.ApiResponse;
import server.utils.JwtUtil;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;
    private final PhaseRepository phaseRepository;
    private final TaskRepositoryImpl taskQuery;
    private final ProjectStatusService projectStatusService;
    private final JwtUtil jwtUtil;
    private final AccountRepository accountRepository;
    private final ProjectRepository projectRepository;
    private final TaskOrderService taskOrderService;
    private final RestTemplate restTemplate = new RestTemplate();
    private final GitHubTokenService gitHubTokenService;
    private final TaskEvidenceRepository taskEvidenceRepository;
    private final EmployeeRepository employeeRepository;
    private final TaskEvidenceService taskEvidenceService;

    @Transactional
    public ApiResponse<?> createTask(CreateTaskDto dto) {
        Phase phase = phaseRepository.findById(dto.getPhaseId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "phase-not-found"
                ));

        int seq = phase.getSequence();
        if (seq > 1) {
            Optional<Phase> prevOpt = phaseRepository
                    .findByProjectIdAndSequence(
                            phase.getProject().getId(), seq - 1
                    );
            if (prevOpt.isPresent() && prevOpt.get().getStatus() != PhaseStatus.COMPLETED) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "previous-phase-not-completed"
                );
            }
        }

        if (dto.getDeadline().isBefore(LocalDate.now())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "deadline-before-today"
            );
        }
        if (dto.getDeadline().isAfter(phase.getDeadline())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "deadline-after-phase-deadline"
            );
        }
        LocalDate projectDeadline = phase.getProject().getDeadline();
        if (projectDeadline != null && dto.getDeadline().isAfter(projectDeadline)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "deadline-after-project-deadline"
            );
        }

        Employee assignee = employeeRepository.findById(dto.getAssigneeId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "assignee-not-found"));

        Long projectId = phase.getProject().getId();
        if (!projectRepository.existsByIdAndEmployees_Id(projectId, assignee.getId())) {
            return ApiResponse.unauthorized("assignee-not-in-project");
        }

        Task task = Task.builder()
                .name(dto.getName().trim())
                .description(dto.getDescription().trim())
                .deadline(dto.getDeadline())
                .size(TaskSize.valueOf(dto.getSize()))
                .status(TaskStatus.PLANNING)
                .phase(phase)
                .assignee(assignee)
                .build();

        Task saved = taskRepository.save(task);
        projectStatusService.refreshStatus(phase.getProject());

        TaskDto result = new TaskDto();
        result.setId(saved.getId());
        result.setName(saved.getName());
        result.setDescription(saved.getDescription());
        result.setDeadline(saved.getDeadline());
        result.setStatus(saved.getStatus().name());
        result.setPhaseId(saved.getPhase().getId());
        result.setAssigneeId(saved.getAssignee().getId());
        result.setAssigneeName(saved.getAssignee().getFirstName() + " " + saved.getAssignee().getLastName());
        return ApiResponse.success(result, "task-created-successfully");
    }

    @Transactional
    public ApiResponse<?> markTaskAsMerged(String branchName, String prUrl, LocalDateTime mergedAt) {
        Task task = taskRepository.findByGithubBranch(branchName);
        if (task == null) {
            return ApiResponse.notfound("Task không tồn tại với branch: " + branchName);
        }
        if (task.isMerged()) {
            return ApiResponse.success(null, "Task đã được merge trước đó: " + branchName);
        }
        task.setMerged(true);
        task.setMergedAt(mergedAt);
        task.setPullRequestUrl(prUrl);
        task.setStatus(TaskStatus.COMPLETED);
        taskRepository.save(task);
        projectStatusService.refreshStatus(task.getPhase().getProject());
        return ApiResponse.success(null, "✅ Task đã được cập nhật: " + branchName);
    }

    public ApiResponse<List<TaskDto>> search(String keyword) {
        updateHiddenFlags();
        List<Task> tasks = taskQuery.searchTasks(keyword);
        return ApiResponse.success(
                tasks.stream().map(this::toDto).collect(Collectors.toList()),
                "search-success" );
    }

    public ApiResponse<List<TaskDto>> filter(String status) {
        updateHiddenFlags();
        List<Task> tasks = taskQuery.filterByStatus(status);
        return ApiResponse.success(
                tasks.stream().map(this::toDto).collect(Collectors.toList()),
                "filter-success");
    }

    public ApiResponse<List<TaskDto>> getAllVisible() {
        updateHiddenFlags();
        List<Task> tasks = taskQuery.getAllVisible();
        return ApiResponse.success(
                tasks.stream().map(this::toDto).collect(Collectors.toList()),
                "fetch-visible-tasks");
    }

    @Transactional(readOnly = true)
    public ApiResponse<List<TaskDto>> getKanbanTasks(Long projectId, HttpServletRequest request) {
        String username = jwtUtil.extractUsernameFromRequest(request);
        Account me = accountRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("invalid-account"));
        Role role = me.getRole();

        Project pr = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("project-not-found"));

        if (pr.getStatus() == ProjectStatus.CANCELED) {
            return ApiResponse.errorServer("project-canceled");
        }
        // PM chỉ xem được project mình quản lý
        if (role == Role.PM && !pr.getProjectManager().getId().equals(me.getId())) {
            return ApiResponse.unauthorized("access-denied");
        }

        // ✅ STAFF mode: EMPLOYEE & HOD giống nhau
        boolean isStaff = (role == Role.EMPLOYEE || role == Role.HOD);

        // Chỉ lấy phase IN_PROGRESS cho staff; còn lại thấy tất cả
        List<Phase> phases = pr.getPhases().stream()
                .filter(p -> isStaff ? p.getStatus() == PhaseStatus.IN_PROGRESS : true)
                .collect(Collectors.toList());

        // Staff: chỉ task được assign cho chính user + không lấy CANCELED
        Stream<Task> taskStream = phases.stream().flatMap(p -> p.getTasks().stream());
        if (isStaff) {
            taskStream = taskStream
                    .filter(t -> t.getAssignee() != null
                            && t.getAssignee().getId().equals(me.getId())
                            && t.getStatus() != TaskStatus.CANCELED);
        }

        List<Task> tasks = taskStream.collect(Collectors.toList());

        // Giữ nguyên thứ tự theo user
        List<Task> sorted = taskOrderService.sortTasksByUserOrder(
                tasks, request.getHeader(HttpHeaders.AUTHORIZATION)
        );

        List<TaskDto> dtos = sorted.stream().map(this::toDto).collect(Collectors.toList());
        return ApiResponse.success(dtos, "kanban-tasks");
    }


    private boolean isTransitionAllowed(TaskStatus from, TaskStatus to, Role role) {
        java.util.EnumSet<TaskStatus> allowed = java.util.EnumSet.of(from);

        switch (from) {
            case PLANNING -> {
                allowed.add(TaskStatus.IN_PROGRESS);
                allowed.add(TaskStatus.CANCELED);
                // ✅ Mở đường cho PLANNING → IN_REVIEW (BE vẫn sẽ kiểm tra evidence/branch ở dưới)
                allowed.add(TaskStatus.IN_REVIEW);
            }
            case IN_PROGRESS -> {
                allowed.add(TaskStatus.CANCELED);
                allowed.add(TaskStatus.IN_REVIEW);
            }
            case IN_REVIEW -> {
                allowed.add(TaskStatus.COMPLETED);
                allowed.add(TaskStatus.CANCELED);
                allowed.add(TaskStatus.IN_PROGRESS);
            }
            case COMPLETED -> {
                allowed.add(TaskStatus.IN_PROGRESS);
                // ❌ bỏ IN_REVIEW để khớp UI
            }
            case CANCELED -> {
                allowed.add(TaskStatus.PLANNING);
                allowed.add(TaskStatus.IN_PROGRESS);
                // ❌ bỏ IN_REVIEW để khớp UI
            }
        }

        if (role == Role.EMPLOYEE) {
            allowed.remove(TaskStatus.COMPLETED);
            allowed.remove(TaskStatus.CANCELED);
        }

        return allowed.contains(to);
    }


    @Transactional
    public ApiResponse<?> updateTask(Long taskId, UpdateTaskDto dto, HttpServletRequest request) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "task-not-found"));

        String username = jwtUtil.extractUsernameFromRequest(request);
        Account me = accountRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("invalid-account"));
        boolean isAssignee   = task.getAssignee()!=null && task.getAssignee().getId().equals(me.getId());
        boolean isPrivileged = me.getRole()==Role.PM || me.getRole()==Role.MANAGER || me.getRole()==Role.ADMIN;
        if (!isAssignee && !isPrivileged) return ApiResponse.unauthorized("access-denied");

        // name
        if (dto.getName() != null) {
            String name = dto.getName().trim();
            if (name.isEmpty()) return ApiResponse.badRequest("name-empty");
            task.setName(name);
        }

        // description
        if (dto.getDescription() != null) {
            task.setDescription(dto.getDescription().trim());
        }

        // size (chỉ PM/MANAGER/ADMIN)
        if (dto.getSize() != null) {
            if (!isPrivileged) return ApiResponse.unauthorized("only-pm-or-manager-can-change-size");
            try {
                task.setSize(TaskSize.valueOf(dto.getSize()));
            } catch (IllegalArgumentException e) {
                return ApiResponse.badRequest("invalid-size");
            }
        }

        // assignee (chỉ PM/MANAGER/ADMIN)
        if (dto.getAssigneeId() != null) {
            if (!isPrivileged) return ApiResponse.unauthorized("only-pm-or-manager-can-change-assignee");
            Employee assignee = employeeRepository.findById(dto.getAssigneeId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "assignee-not-found"));
            Long projectId = task.getPhase().getProject().getId();
            if (!projectRepository.existsByIdAndEmployees_Id(projectId, assignee.getId())) {
                return ApiResponse.unauthorized("assignee-not-in-project");
            }
            task.setAssignee(assignee);
        }

        // ✅ deadline: chỉ validate khi khác giá trị hiện tại
        if (dto.getDeadline() != null) {
            LocalDate newDl = dto.getDeadline();
            LocalDate oldDl = task.getDeadline();

            if (!newDl.equals(oldDl)) {
                if (newDl.isBefore(LocalDate.now())) {
                    return ApiResponse.badRequest("deadline-before-today");
                }
                LocalDate phaseDl = task.getPhase().getDeadline();
                if (phaseDl != null && newDl.isAfter(phaseDl)) {
                    return ApiResponse.badRequest("deadline-after-phase-deadline");
                }
                LocalDate projectDl = task.getPhase().getProject().getDeadline();
                if (projectDl != null && newDl.isAfter(projectDl)) {
                    return ApiResponse.badRequest("deadline-after-project-deadline");
                }
                task.setDeadline(newDl);
            }
        }

        taskRepository.save(task);
        projectStatusService.refreshStatus(task.getPhase().getProject());
        return ApiResponse.success(toDto(task), "task-updated");
    }

    @Transactional
    public ApiResponse<?> updateTaskStatus(Long taskId, String newStatus, HttpServletRequest request) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "task-not-found"));

        final TaskStatus target;
        try {
            target = TaskStatus.valueOf(newStatus);
        } catch (IllegalArgumentException e) {
            return ApiResponse.badRequest("invalid-status");
        }

        String username = jwtUtil.extractUsernameFromRequest(request);
        Account me = accountRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("invalid-account"));
        boolean isAssignee = task.getAssignee()!=null && task.getAssignee().getId().equals(me.getId());
        boolean isPrivileged = me.getRole()==Role.PM || me.getRole()==Role.MANAGER || me.getRole()==Role.ADMIN;
        if (!isAssignee && !isPrivileged) return ApiResponse.unauthorized("access-denied");

        // 🚫 Chặn kéo task khi phase đã CANCELED để tránh reopen ngầm
        Phase phase = task.getPhase();
        if (phase.getStatus() == PhaseStatus.CANCELED) {
            return ApiResponse.badRequest("phase-is-canceled");
        }

        boolean hasBranch   = task.getGithubBranch()!=null && !task.getGithubBranch().isBlank();
        boolean hasEvidence = taskEvidenceRepository.countByTaskId(taskId) > 0;
        TaskStatus from = task.getStatus();

        if (!isTransitionAllowed(from, target, me.getRole())) {
            return ApiResponse.badRequest("transition-not-allowed");
        }

        switch (target) {
            case IN_REVIEW -> {
                if (!(hasBranch || hasEvidence)) {
                    return ApiResponse.badRequest("evidence-or-branch-required");
                }
                task.setStatus(TaskStatus.IN_REVIEW);
            }
            case IN_PROGRESS -> {
                task.setStatus(TaskStatus.IN_PROGRESS);
            }
            case COMPLETED -> {
                if (hasBranch) {
                    if (task.isMerged()) {
                        task.setStatus(TaskStatus.COMPLETED);
                    } else {
                        if (!isPrivileged) return ApiResponse.badRequest("merge-required-or-privileged-override");
                        task.setStatus(TaskStatus.COMPLETED);
                    }
                } else {
                    if (!isPrivileged) return ApiResponse.unauthorized("only-pm-or-manager-can-complete");
                    if (!hasEvidence)  return ApiResponse.badRequest("evidence-required");
                    task.setStatus(TaskStatus.COMPLETED);
                }
            }
            default -> task.setStatus(target);
        }

        taskRepository.save(task);
        projectStatusService.refreshStatus(task.getPhase().getProject());
        return ApiResponse.success(null, "task-status-updated-successfully");
    }

    public void updateHiddenFlags() {
        List<Task> completedTasks = taskQuery.getCompletedTasks();
        for (Task task : completedTasks) {
            if (task.getDeadline() != null && task.getDeadline().isBefore(LocalDate.now().minusDays(30))) {
                if (!task.isHidden()) {
                    task.setHidden(true);
                    taskRepository.save(task);
                }
            } else {
                if (task.isHidden()) {
                    task.setHidden(false);
                    taskRepository.save(task);
                }
            }
        }
    }

    private TaskDto toDto(Task task) {
        TaskDto dto = new TaskDto();
        dto.setId(task.getId());
        dto.setName(task.getName());
        dto.setDescription(task.getDescription());
        dto.setDeadline(task.getDeadline());
        dto.setStatus(task.getStatus().name());
        dto.setSize(task.getSize() != null ? task.getSize().name() : null);
        dto.setPhaseId(task.getPhase().getId());
        dto.setHidden(task.isHidden());
        dto.setTotalSubtasks(0);
        dto.setDoneSubtasks(0);
        if (task.getAssignee() != null) {
            dto.setAssigneeId(task.getAssignee().getId());
            dto.setAssigneeName(task.getAssignee().getFirstName() + " " + task.getAssignee().getLastName());
            if (task.getAssignee().getAccount() != null) {
                dto.setAssigneeUsername(task.getAssignee().getAccount().getUsername());
            }
        }
        dto.setGithubBranch(task.getGithubBranch());
        dto.setBranchCreated(task.isBranchCreated());
        dto.setPullRequestUrl(task.getPullRequestUrl());
        dto.setMerged(task.isMerged());
        dto.setMergedAt(task.getMergedAt());
        return dto;
    }

    public void checkMergedPullRequests() {
        List<Task> tasksToCheck = taskRepository.findAll().stream()
                .filter(t -> t.getStatus() == TaskStatus.IN_REVIEW )
                .filter(t -> t.getGithubBranch() != null && !t.getGithubBranch().isEmpty())
                .toList();

        for (Task task : tasksToCheck) {
            var pm = task.getPhase().getProject().getProjectManager();
            var tokenOpt = gitHubTokenService.getToken(pm);
            if (tokenOpt.isEmpty()) continue;

            var prInfo = findLatestMergedPR(
                    task.getPhase().getProject().getRepoOwner(),
                    task.getPhase().getProject().getRepoName(),
                    task.getGithubBranch(),
                    tokenOpt.get()
            );

            prInfo.ifPresent(info ->
                    markTaskAsMerged(task.getGithubBranch(), info.htmlUrl(), info.mergedAt())
            );
        }
    }

    private Optional<PullRequestInfo> findLatestMergedPR(String owner, String repo, String branch, String token) {
        String url = String.format(
                "https://api.github.com/repos/%s/%s/pulls?state=closed&sort=updated&direction=desc&per_page=100",
                owner, repo
        );
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        headers.set("X-GitHub-Api-Version", "2022-11-28");
        HttpEntity<Void> entity = new HttpEntity<>(headers);
        try {
            ResponseEntity<List> response = restTemplate.exchange(url, HttpMethod.GET, entity, List.class);
            List<Map<String, Object>> prs = response.getBody();
            return prs.stream()
                    .filter(pr -> pr.get("merged_at") != null)
                    .filter(pr -> branch.equalsIgnoreCase(((Map<String, Object>) pr.get("head")).get("ref").toString()))
                    .max(Comparator.comparing(pr -> OffsetDateTime.parse(pr.get("updated_at").toString())))
                    .map(pr -> new PullRequestInfo(pr.get("html_url").toString(),
                            OffsetDateTime.parse(pr.get("merged_at").toString()).toLocalDateTime()));
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    private record PullRequestInfo(String htmlUrl, LocalDateTime mergedAt) {}
}
