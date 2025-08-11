package server.services;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import server.dtos.*;

import server.models.*;
import server.models.enums.*;

import server.models.*;
import server.models.enums.*;


import server.models.Account;
import server.models.Document;
import server.models.Project;
import server.models.Task;
import server.models.enums.PhaseStatus;
import server.models.enums.ProjectStatus;
import server.models.enums.TaskStatus;

import server.repositories.*;
import server.utils.ApiResponse;
import server.utils.JwtUtil;


import java.io.IOException;

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

    public ApiResponse<List<ProjectDto>> getAllVisible(HttpServletRequest request) {
        updateHiddenFlags();

        String username = jwtUtil.extractUsernameFromRequest(request);
        Account account = accountRepository.findByUsername(username).orElse(null);
        if (account == null) {
            return ApiResponse.unauthorized("unauthorized");
        }

        List<Project> projects;
        String role = String.valueOf(account.getRole());

        if ("ADMIN".equals(role) || "MANAGER".equals(role)) {
            projects = projectQuery.getAllVisible();
        } else if ("PM".equals(role)) {
            projects = projectQuery.getAllVisible().stream()
                    .filter(p -> p.getProjectManager() != null
                            && p.getProjectManager().getId().equals(account.getId()))
                    .collect(Collectors.toList());
        } else {
            projects = List.of();
        }

        List<ProjectDto> dtos = projects.stream().map(this::toDto).collect(Collectors.toList());
        return ApiResponse.success(dtos, "fetch-projects-success");
    }

    public boolean isProjectManager(Long projectId, String username) {
        return projectRepository.findById(projectId)
                .map(p -> p.getProjectManager() != null
                        && p.getProjectManager().getUsername().equals(username))
                .orElse(false);
    }

    public ApiResponse<ProjectDto> getProjectDetail(Long id) {
        Project project = projectRepository.findById(id).orElse(null);
        if (project == null) {
            return ApiResponse.notfound("project-not-found");
        }
        return ApiResponse.success(toDto(project), "project-detail");
    }

    public ApiResponse<List<ProjectDto>> getDoneProjects() {
        List<Project> projects = projectQuery.getDoneProjects();
        return ApiResponse.success(
                projects.stream().map(this::toDto).collect(Collectors.toList()),
                "fetch-done-projects-success"
        );
    }

    public ApiResponse<List<ProjectDto>> search(HttpServletRequest request, String keyword) {
        String username = jwtUtil.extractUsernameFromRequest(request);
        Account account = accountRepository.findByUsername(username).orElse(null);
        if (account == null) {
            return ApiResponse.unauthorized("unauthorized");
        }

        List<Project> projects = projectQuery.searchProjects(keyword);

        if ("PM".equals(String.valueOf(account.getRole()))) {
            projects = projects.stream()
                    .filter(p -> p.getProjectManager() != null
                            && p.getProjectManager().getId().equals(account.getId()))
                    .collect(Collectors.toList());
        }

        List<ProjectDto> dtos = projects.stream().map(this::toDto).collect(Collectors.toList());
        return ApiResponse.success(dtos, "search-success");
    }

    public ApiResponse<List<ProjectDto>> filter(String status, String priority) {
        List<Project> projects = projectQuery.filter(status, priority);
        return ApiResponse.success(
                projects.stream().map(this::toDto).collect(Collectors.toList()),
                "filter-success"
        );
    }

    public ApiResponse<?> createProject(CreateProjectDto dto, HttpServletRequest request) {
        Document document = documentRepository.findById(dto.getDocumentId())
                .orElseThrow(() -> new IllegalArgumentException("Document not found"));

        if (document.getProject() != null) {
            return ApiResponse.errorServer("Document này đã được gắn với một Project rồi");
        }

        if (document.getStatus() != DocumentStatus.SIGNED) {
            return ApiResponse.errorServer("Công văn chưa được ký duyệt. Không thể tạo dự án!");
        }

        Account pm = document.getReceiver();
        if (pm == null) {
            return ApiResponse.errorServer("Document không có người tiếp nhận (PM)");
        }

        Project project = Project.builder()
                .name(document.getProjectName())
                .description(document.getProjectDescription())
                .createdAt(LocalDate.now())
                .deadline(document.getProjectDeadline())
                .deadline(dto.getDeadline())
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
                project.getId(),
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
            var badTasks  = taskRepository.findTasksDeadlineAfter(project.getId(), newDeadline);
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

    private ProjectDto toDto(Project project) {
        ProjectDto dto = new ProjectDto();
        dto.setId(project.getId());
        dto.setName(project.getName());
        dto.setDescription(project.getDescription());
        dto.setCreatedAt(project.getCreatedAt());
        dto.setDeadline(project.getDeadline());
        dto.setStatus(project.getStatus().toString());

        // ✅ Trả repoLink luôn cho FE (ưu tiên cột repoLink; fallback owner/name)
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
            dto.setPmName(emp.getFirstName() + " " + emp.getLastName());
        }

        // Gom task hợp lệ (không tính CANCELED) để tính progress
        List<Task> allTasks = new ArrayList<>();
        if (project.getPhases() != null) {
            project.getPhases().forEach(phase -> {
                if (phase.getTasks() != null) allTasks.addAll(phase.getTasks());
            });
        }
        List<Task> validTasks = allTasks.stream()
                .filter(t -> t.getStatus() != TaskStatus.CANCELED)
                .toList();

        int total = validTasks.size();
        int done = (int) validTasks.stream().filter(t -> t.getStatus() == TaskStatus.COMPLETED).count();

        dto.setTotalTask(total);
        dto.setDoneTask(done);
        dto.setProgress(total == 0 ? 0 : (int) Math.round((done * 100.0) / total));
        dto.setCompletedAt(project.getCompletedAt());

        dto.setTasks(validTasks.stream().map(this::toTaskDto).collect(Collectors.toList()));
        return dto;
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

    /**
     * Lấy danh sách Project cho Kanban Board (Employee)
     */
    public ApiResponse<List<ProjectDto>> getKanbanProjects(HttpServletRequest request) {
        String username = jwtUtil.extractUsernameFromRequest(request);
        Account me = accountRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("invalid-account"));

        List<Project> projects = projectQuery.getAllVisible().stream()
                .filter(pr -> pr.getStatus() != ProjectStatus.CANCELED)
                .filter(pr -> pr.getPhases() != null && pr.getPhases().stream()
                        .anyMatch(p -> p != null
                                && p.getStatus() == PhaseStatus.IN_PROGRESS
                                && p.getTasks() != null
                                && p.getTasks().stream().anyMatch(t ->
                                t != null
                                        && t.getAssignee() != null
                                        && t.getAssignee().getId().equals(me.getId())
                                        && t.getStatus() != TaskStatus.CANCELED)))
                .collect(Collectors.toList());

        List<ProjectDto> dtos = projects.stream().map(this::toDto).collect(Collectors.toList());
        return ApiResponse.success(dtos, "kanban-projects");
    }
}
