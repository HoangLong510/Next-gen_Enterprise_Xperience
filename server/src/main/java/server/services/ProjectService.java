package server.services;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import server.dtos.CreateProjectDto;
import server.dtos.ProjectDto;
import server.dtos.ProjectUpdateDto;
import server.dtos.RepoRequestDto;
import server.dtos.TaskDto;
import server.dtos.UpdateProjectDto;
import server.models.Account;
import server.models.Document;
import server.models.Project;
import server.models.Task;
import server.models.enums.*;
import server.repositories.AccountRepository;
import server.repositories.DocumentRepository;
import server.repositories.PhaseRepository;
import server.repositories.ProjectRepository;
import server.repositories.ProjectRepositoryImpl;
import server.repositories.TaskRepository;
import server.utils.ApiResponse;
import server.utils.JwtUtil;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final PhaseRepository phaseRepository;
    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final ProjectRepositoryImpl projectQuery;
    private final DocumentRepository documentRepository;
    private final GitHubRepoService gitHubRepoService;
    private final JwtUtil jwtUtil;
    private final AccountRepository accountRepository;
    private final GitHubTokenService gitHubTokenService;
    private final NotificationService notificationService;

    /* ==================== QUYỀN TRUY CẬP ==================== */

    /**
     * - ADMIN/MANAGER: true
     * - PM của project: true
     * - EMPLOYEE/HOD: true nếu Project có Phase IN_PROGRESS và trong đó có Task non-canceled
     * (PLANNING/IN_PROGRESS/IN_REVIEW/COMPLETED)
     */
    // ProjectService.java
    private boolean isMemberOfProject(Project p, Account viewer) {
        return viewer != null
                && viewer.getEmployee() != null
                && p.getId() != null
                && projectRepository.existsByIdAndEmployees_Id(p.getId(), viewer.getEmployee().getId());
    }

    public boolean hasProjectAccess(Long projectId, String username) {
        Optional<Account> accOpt = accountRepository.findByUsername(username);
        if (accOpt.isEmpty()) return false;
        Account viewer = accOpt.get();
        Role role = viewer.getRole();

        if (role == Role.ADMIN || role == Role.MANAGER) return true;

        return projectRepository.findById(projectId).map(pr -> {
            if (role == Role.PM) {
                return pr.getProjectManager() != null
                        && pr.getProjectManager().getUsername().equals(username);
            }
            if (role == Role.EMPLOYEE || role == Role.HOD) {
                // ✅ MỚI: là member thì thấy, hoặc Project đang có active phase + live tasks
                boolean member = viewer.getEmployee() != null
                        && projectRepository.existsByIdAndEmployees_Id(projectId, viewer.getEmployee().getId());
                return member || projectHasActivePhaseWithLiveTasks(pr);
            }
            return false;
        }).orElse(false);
    }


    public boolean isProjectManager(Long projectId, String username) {
        return projectRepository.findById(projectId)
                .map(p -> p.getProjectManager() != null
                        && p.getProjectManager().getUsername().equals(username))
                .orElse(false);
    }

    /* ==================== LIST / SEARCH / FILTER ==================== */

    // ProjectService.java

    public ApiResponse<List<ProjectDto>> getAllVisible(HttpServletRequest request) {
        updateHiddenFlags();

        Account viewer = requireViewer(request);
        Role role = viewer.getRole();

        List<Project> all = projectQuery.getAllVisible();

        List<Project> filtered;
        if (role == Role.ADMIN || role == Role.MANAGER) {
            filtered = all;
        } else if (role == Role.PM) {
            filtered = all.stream()
                    .filter(p -> p.getProjectManager() != null
                            && p.getProjectManager().getId().equals(viewer.getId()))
                    .toList();
        } else { // EMPLOYEE / HOD
            // ✅ MỚI: là member HOẶC project có active phase + live tasks
            filtered = all.stream()
                    .filter(p -> isMemberOfProject(p, viewer) || projectHasActivePhaseWithLiveTasks(p))
                    .toList();
        }

        List<ProjectDto> dtos = filtered.stream().map(this::toDtoOverall).toList();
        return ApiResponse.success(dtos, "fetch-projects-success");
    }


    public ApiResponse<List<ProjectDto>> getDoneProjects(HttpServletRequest request) {
        Account viewer = requireViewer(request);
        Role role = viewer.getRole();

        List<Project> allDone = projectQuery.getDoneProjects();

        List<Project> filtered;
        if (role == Role.ADMIN || role == Role.MANAGER) {
            filtered = allDone;
        } else if (role == Role.PM) {
            filtered = allDone.stream()
                    .filter(p -> p.getProjectManager() != null
                            && p.getProjectManager().getId().equals(viewer.getId()))
                    .toList();
        } else {
            // theo yêu cầu mới: EMP/HOD không cần thấy Done
            filtered = List.of();
        }

        List<ProjectDto> dtos = filtered.stream()
                .map(this::toDtoOverall)
                .toList();
        return ApiResponse.success(dtos, "fetch-done-projects-success");
    }

    // ProjectService.java

    public ApiResponse<List<ProjectDto>> search(HttpServletRequest request, String keyword) {
        Account viewer = requireViewer(request);
        Role role = viewer.getRole();

        List<Project> all = projectQuery.searchProjects(keyword);

        List<Project> filtered;
        if (role == Role.ADMIN || role == Role.MANAGER) {
            filtered = all;
        } else if (role == Role.PM) {
            filtered = all.stream()
                    .filter(p -> p.getProjectManager() != null
                            && p.getProjectManager().getId().equals(viewer.getId()))
                    .toList();
        } else { // EMPLOYEE / HOD
            filtered = all.stream()
                    .filter(p -> isMemberOfProject(p, viewer) || projectHasActivePhaseWithLiveTasks(p))
                    .toList();
        }

        List<ProjectDto> dtos = filtered.stream().map(this::toDtoOverall).toList();
        return ApiResponse.success(dtos, "search-success");
    }


    // ProjectService.java

    public ApiResponse<List<ProjectDto>> filter(HttpServletRequest request, String status, String priority) {
        Account viewer = requireViewer(request);
        Role role = viewer.getRole();

        List<Project> all = projectQuery.filter(status, priority);

        List<Project> filtered;
        if (role == Role.ADMIN || role == Role.MANAGER) {
            filtered = all;
        } else if (role == Role.PM) {
            filtered = all.stream()
                    .filter(p -> p.getProjectManager() != null
                            && p.getProjectManager().getId().equals(viewer.getId()))
                    .toList();
        } else { // EMPLOYEE / HOD
            filtered = all.stream()
                    .filter(p -> isMemberOfProject(p, viewer) || projectHasActivePhaseWithLiveTasks(p))
                    .toList();
        }

        List<ProjectDto> dtos = filtered.stream().map(this::toDtoOverall).toList();
        return ApiResponse.success(dtos, "filter-success");
    }


    /* ==================== DETAIL ==================== */

    // ADMIN/MANAGER/PM: thấy full task
    // EMP/HOD: chỉ trả task của chính họ (progress tổng thể vẫn theo toàn bộ project)
    public ApiResponse<ProjectDto> getProjectDetail(Long id, HttpServletRequest request) {
        Account viewer = requireViewer(request);
        Project project = projectRepository.findById(id).orElse(null);
        if (project == null) {
            return ApiResponse.notfound("project-not-found");
        }

        boolean onlyMine = (viewer.getRole() == Role.EMPLOYEE || viewer.getRole() == Role.HOD);

        ProjectDto dto = toDtoForViewer(project, viewer, onlyMine);
        return ApiResponse.success(dto, "project-detail");
    }

    /* ==================== CRUD / LINK REPO ==================== */

    @Transactional
    public ApiResponse<?> createProject(CreateProjectDto dto, HttpServletRequest request) {
        Document document = documentRepository.findById(dto.getDocumentId())
                .orElseThrow(() -> new IllegalArgumentException("Document not found"));

        if (document.getProject() != null) {
            return ApiResponse.errorServer("Document này đã được gắn với một Project rồi");
        }
        if (document.getStatus() != DocumentStatus.SIGNED) {
            return ApiResponse.errorServer("Công văn chưa được ký duyệt. Không thể tạo dự án!");
        }


        Account pm = document.getPm();
        if (pm == null) {
            return ApiResponse.errorServer("Document không có người PM (pm_id).");
        }

        String name = (dto.getName() != null && !dto.getName().isBlank())
                ? dto.getName().trim()
                : document.getProjectName();

        String description = (dto.getDescription() != null && !dto.getDescription().isBlank())
                ? dto.getDescription().trim()
                : document.getProjectDescription();

        LocalDate deadline = (dto.getDeadline() != null)
                ? dto.getDeadline()
                : document.getProjectDeadline();

        Project project = Project.builder()
                .name(name)
                .description(description)
                .createdAt(LocalDate.now())
                .deadline(deadline)
                .status(ProjectStatus.PLANNING)
                .document(document)
                .projectManager(pm)
                .build();

        projectRepository.save(project);
        projectRepository.flush();

        document.setProject(project);
        document.setStatus(DocumentStatus.IN_PROGRESS);
        documentRepository.save(document);

        notificationService.createNotification(
                NotificationType.PROJECT,
                document.getId(),
                false
        );

        return ApiResponse.success(null, "project-created-successfully");
    }

    public ApiResponse<?> deleteProject(Long id) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));

        project.setStatus(ProjectStatus.CANCELED);
        projectRepository.save(project);

        return ApiResponse.success(null, "project-canceled-successfully");
    }

    public ApiResponse<?> getProjectRepo(Long id, HttpServletRequest request) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("project-not-found"));

        String username = jwtUtil.extractUsernameFromRequest(request);
        Account me = accountRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("invalid-account"));

        if (project.getProjectManager() == null || !project.getProjectManager().getId().equals(me.getId())) {
            return ApiResponse.unauthorized("access-denied");
        }

        var tokenOpt = gitHubTokenService.getToken(me);
        if (tokenOpt.isEmpty()) {
            return ApiResponse.unauthorized("please-login-github-to-continue");
        }

        boolean hasRepo = project.getRepoOwner() != null && project.getRepoName() != null;
        if (!hasRepo) {
            return new ApiResponse<>(null, "no-repo-linked", 204);
        }

        Map<String, Object> repo = Map.of(
                "repoLink", project.getRepoLink(),
                "owner", project.getRepoOwner(),
                "name", project.getRepoName(),
                "defaultBranch", project.getDefaultBranch()
        );
        return ApiResponse.success(repo, "repo-info");
    }

    @Transactional
    public ApiResponse<?> updateProject(Long id, UpdateProjectDto dto) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));

        ProjectStatus oldStatus = project.getStatus();

        boolean hasAnyTask = project.getPhases() != null && project.getPhases().stream()
                .anyMatch(ph -> ph.getTasks() != null && !ph.getTasks().isEmpty());

        if (dto.getStatus() == ProjectStatus.PLANNING && hasAnyTask) {
            return ApiResponse.badRequest("cannot-set-planning-when-has-tasks");
        }

        if (dto.getStatus() == ProjectStatus.COMPLETED) {
            boolean allTasksCompleted = project.getPhases() == null || project.getPhases().stream()
                    .flatMap(ph -> ph.getTasks() == null ? java.util.stream.Stream.<Task>empty() : ph.getTasks().stream())
                    .filter(t -> t.getStatus() != TaskStatus.CANCELED)
                    .allMatch(t -> t.getStatus() == TaskStatus.COMPLETED);
            if (!allTasksCompleted) {
                return ApiResponse.badRequest("cannot-complete-project-while-some-tasks-not-completed");
            }
        }

        project.setName(dto.getName());
        project.setDescription(dto.getDescription());

        if (dto.getDeadline() != null && !dto.getDeadline().equals(project.getDeadline())) {
            var newDeadline = dto.getDeadline();
            if (newDeadline.isBefore(LocalDate.now()))
                return ApiResponse.validation(Map.of("deadline", "deadline-cannot-be-in-the-past"));

            var badPhases = phaseRepository.findByProjectIdAndDeadlineAfter(project.getId(), newDeadline);
            var badTasks = taskRepository.findTasksDeadlineAfter(project.getId(), newDeadline);
            if (!badPhases.isEmpty() || !badTasks.isEmpty())
                return ApiResponse.validation(Map.of("deadline", "project-deadline-conflict"));

            project.setDeadline(newDeadline);
        }

        project.setStatus(dto.getStatus());

        if (oldStatus == ProjectStatus.COMPLETED && dto.getStatus() != ProjectStatus.COMPLETED) {
            if (project.isHidden()) project.setHidden(false);
        }

        if (oldStatus != ProjectStatus.COMPLETED && dto.getStatus() == ProjectStatus.COMPLETED) {
            project.setCompletedAt(LocalDateTime.now());
        }

        projectRepository.save(project);
        return ApiResponse.success(new ProjectUpdateDto(project), "project-updated-successfully");
    }

    public ApiResponse<?> linkRepo(Long projectId, RepoRequestDto dto, HttpServletRequest request) {
        Optional<Project> projectOpt = projectRepository.findById(projectId);
        if (projectOpt.isEmpty()) {
            return ApiResponse.errorServer("Project not found");
        }

        String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ApiResponse.errorServer("please-login-to-continue");
        }

        String jwt = authHeader.substring(7);
        String username = jwtUtil.extractUsername(jwt);
        Account account = accountRepository.findByUsername(username).orElse(null);
        if (account == null) {
            return ApiResponse.errorServer("invalid-account");
        }

        Project project = projectOpt.get();
        if (project.getProjectManager() == null || !project.getProjectManager().equals(account)) {
            return ApiResponse.errorServer("only-project-manager-can-link-repo");
        }

        Optional<String> tokenOpt = gitHubTokenService.getToken(account);
        if (tokenOpt.isEmpty()) {
            return ApiResponse.errorServer("please-login-github-to-continue");
        }

        try {
            GitHubRepoService.GitHubRepoInfo info =
                    gitHubRepoService.fetchRepoInfo(dto.getRepoUrl(), tokenOpt.get());

            project.setRepoLink(dto.getRepoUrl());
            project.setRepoOwner(info.owner());
            project.setRepoName(info.repo());
            project.setDefaultBranch(info.defaultBranch());

            projectRepository.save(project);
            return ApiResponse.success(null, "Repo linked successfully");
        } catch (Exception e) {
            return ApiResponse.errorServer("Invalid repo or access denied");
        }
    }

    /* ==================== KANBAN (PROJECT LIST CHO EMP/HOD) ==================== */

    // ProjectService.java

    public ApiResponse<List<ProjectDto>> getKanbanProjects(HttpServletRequest request) {
        Account viewer = requireViewer(request);
        Role role = viewer.getRole();

        List<Project> all = projectQuery.getAllVisible().stream()
                .filter(pr -> pr.getStatus() != ProjectStatus.CANCELED)
                .toList();

        List<Project> filtered;
        if (role == Role.ADMIN || role == Role.MANAGER) {
            filtered = all;
        } else if (role == Role.PM) {
            filtered = all.stream()
                    .filter(p -> p.getProjectManager() != null
                            && p.getProjectManager().getId().equals(viewer.getId()))
                    .toList();
        } else { // EMPLOYEE / HOD
            filtered = all.stream()
                    .filter(p -> isMemberOfProject(p, viewer) || projectHasActivePhaseWithLiveTasks(p))
                    .toList();
        }

        List<ProjectDto> dtos = filtered.stream().map(this::toDtoOverall).toList();
        return ApiResponse.success(dtos, "kanban-projects");
    }


    /* ==================== HELPERS ==================== */

    private Account requireViewer(HttpServletRequest request) {
        String username = jwtUtil.extractUsernameFromRequest(request);
        return accountRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("invalid-account"));
    }

    /**
     * Project thỏa điều kiện: có Phase IN_PROGRESS và trong đó có Task
     * thuộc {PLANNING, IN_PROGRESS, IN_REVIEW, COMPLETED} và không hidden.
     * Ưu tiên query qua TaskRepository để tránh N+1.
     */
    private boolean projectHasActivePhaseWithLiveTasks(Project p) {
        if (p.getId() == null) return false;
        var allowed = List.of(TaskStatus.PLANNING, TaskStatus.IN_PROGRESS,
                TaskStatus.IN_REVIEW, TaskStatus.COMPLETED);
        try {
            return taskRepository.existsLiveTaskInActivePhase(p.getId(), allowed);
        } catch (Exception e) {
            // fallback khi repository chưa sẵn sàng hoặc lỗi runtime
            if (p.getPhases() == null) return false;
            return p.getPhases().stream()
                    .filter(ph -> ph != null && ph.getStatus() == server.models.enums.PhaseStatus.IN_PROGRESS)
                    .anyMatch(ph -> ph.getTasks() != null && ph.getTasks().stream()
                            .filter(Objects::nonNull)
                            .anyMatch(t -> t.getStatus() != TaskStatus.CANCELED && !t.isHidden()));
        }
    }

    private boolean isTaskAssignedTo(Task t, Account viewer) {
        return viewer != null
                && viewer.getEmployee() != null
                && t.getAssignee() != null
                && Objects.equals(t.getAssignee().getId(), viewer.getEmployee().getId());
    }

    /**
     * Dùng cho list: progress tổng thể project, không lọc task
     */
    private ProjectDto toDtoOverall(Project project) {
        return toDtoInternal(project, null, false, true);
    }

    /**
     * Dùng cho detail: EMP/HOD chỉ xem task của mình; các role khác xem full
     */
    private ProjectDto toDtoForViewer(Project project, Account viewer, boolean onlyMine) {
        return toDtoInternal(project, viewer, onlyMine, false);
    }

    /**
     * @param overallProgress nếu true -> tính progress toàn project (bỏ qua onlyMine)
     *                        nếu false + onlyMine=true -> tasks trả về chỉ của viewer, nhưng progress vẫn theo toàn bộ project
     */
    private ProjectDto toDtoInternal(Project project, Account viewer, boolean onlyMine, boolean overallProgress) {
        ProjectDto dto = new ProjectDto();
        dto.setId(project.getId());
        dto.setName(project.getName());
        dto.setDescription(project.getDescription());
        dto.setCreatedAt(project.getCreatedAt());
        dto.setDeadline(project.getDeadline());
        dto.setStatus(project.getStatus().toString());

        // repo link hiển thị
        String link = project.getRepoLink();
        if ((link == null || link.isBlank())
                && project.getRepoOwner() != null && project.getRepoName() != null) {
            link = "https://github.com/" + project.getRepoOwner() + "/" + project.getRepoName();
        }
        dto.setRepoLink(link);

        if (project.getDocument() != null) {
            dto.setDocumentId(project.getDocument().getId());
            dto.setDocumentCode(project.getDocument().getCode());
        }

        if (project.getProjectManager() != null && project.getProjectManager().getEmployee() != null) {
            var emp = project.getProjectManager().getEmployee();
            dto.setPmId(project.getProjectManager().getId());
            dto.setPmName((emp.getFirstName() + " " + emp.getLastName()).trim());
        }

        // progress tổng thể (không lọc)
        List<Task> allTasks = collectAllTasks(project);
        List<Task> validTasks = allTasks.stream()
                .filter(t -> t.getStatus() != TaskStatus.CANCELED)
                .toList();
        int total = validTasks.size();
        int done = (int) validTasks.stream().filter(t -> t.getStatus() == TaskStatus.COMPLETED).count();

        dto.setTotalTask(total);
        dto.setDoneTask(done);
        dto.setProgress(total == 0 ? 0 : (int) Math.round((done * 100.0) / total));
        dto.setCompletedAt(project.getCompletedAt());

        // danh sách task trả về trong DTO
        List<Task> tasksForDto;
        if (onlyMine && viewer != null) {
            tasksForDto = validTasks.stream()
                    .filter(t -> isTaskAssignedTo(t, viewer))
                    .toList();
        } else {
            tasksForDto = validTasks;
        }
        dto.setTasks(tasksForDto.stream().map(this::toTaskDto).collect(Collectors.toList()));

        return dto;
    }

    private List<Task> collectAllTasks(Project project) {
        List<Task> all = new ArrayList<>();
        if (project.getPhases() != null) {
            project.getPhases().forEach(ph -> {
                if (ph.getTasks() != null) all.addAll(ph.getTasks());
            });
        }
        return all;
    }

    private TaskDto toTaskDto(Task task) {
        TaskDto dto = new TaskDto();
        dto.setId(task.getId());
        dto.setName(task.getName());
        dto.setDescription(task.getDescription());
        dto.setDeadline(task.getDeadline());
        dto.setStatus(task.getStatus().toString());
        dto.setTotalSubtasks(0);
        dto.setDoneSubtasks(0);
        return dto;
    }

    /* ==================== HIDDEN FLAGS ==================== */


//        List<Project> projects = projectQuery.getAllVisible().stream()
//                .filter(pr -> pr.getStatus() != ProjectStatus.CANCELED)
//                .filter(pr -> pr.getPhases() != null && pr.getPhases().stream()
//                        .anyMatch(p -> p != null
//                                && p.getStatus() == PhaseStatus.IN_PROGRESS
//                                && p.getTasks() != null
//                                && p.getTasks().stream().anyMatch(t ->
//                                t != null
//                                        && t.getAssignee().getAccount() != null
//                                        && t.getAssignee().getAccount().getId().equals(me.getId())
//                                        && t.getStatus() != TaskStatus.CANCELED)))
//                .collect(Collectors.toList());
//
//        List<ProjectDto> dtos = projects.stream().map(this::toDto).collect(Collectors.toList());
//        return ApiResponse.success(dtos, "kanban-projects");

    public void updateHiddenFlags() {
        List<Project> completedProjects = projectQuery.getDoneProjects();
        for (Project project : completedProjects) {
            if (project.getCompletedAt() != null
                    && project.getCompletedAt().isBefore(LocalDateTime.now().minusDays(30))) {
                if (!project.isHidden()) {
                    project.setHidden(true);
                    projectRepository.save(project);
                }
            } else {
                if (project.isHidden()) {
                    project.setHidden(false);
                    projectRepository.save(project);
                }
            }
        }
    }
}
