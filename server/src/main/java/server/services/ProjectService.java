package server.services;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import server.dtos.*;
import server.models.*;
import server.models.enums.*;
import server.repositories.*;
import server.utils.ApiResponse;
import server.utils.JwtUtil;

import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final ProjectRepositoryImpl projectQuery;
    private final DocumentRepository documentRepository;
    private final GitHubRepoService gitHubRepoService;
    private final JwtUtil jwtUtil;
    private final AccountRepository accountRepository;
    private final GitHubTokenService gitHubTokenService;
    private final NotificationService notificationService;

    public ApiResponse<List<ProjectDto>> getAllVisible() {
        updateHiddenFlags();
        List<Project> projects = projectQuery.getAllVisible();
        return ApiResponse.success(projects.stream().map(this::toDto).collect(Collectors.toList()), "fetch-projects-success");
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
        return ApiResponse.success(projects.stream().map(this::toDto).collect(Collectors.toList()), "fetch-done-projects-success");
    }

    public ApiResponse<List<ProjectDto>> search(String keyword) {
        List<Project> projects = projectQuery.searchProjects(keyword);
        return ApiResponse.success(projects.stream().map(this::toDto).collect(Collectors.toList()), "search-success");
    }

    public ApiResponse<List<ProjectDto>> filter(String status, String priority) {
        List<Project> projects = projectQuery.filter(status, priority);
        return ApiResponse.success(projects.stream().map(this::toDto).collect(Collectors.toList()), "filter-success");
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
                .priority(document.getProjectPriority())
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
        return ApiResponse.success(null, "project-created");
    }

    public ApiResponse<?> deleteProject(Long id) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));

        project.setStatus(ProjectStatus.CANCELED);
        projectRepository.save(project);

        return ApiResponse.success(null, "project-canceled");
    }

    public ApiResponse<?> updateProject(Long id, UpdateProjectDto dto) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));

        project.setName(dto.getName());
        project.setDescription(dto.getDescription());
        project.setDeadline(dto.getDeadline());
        project.setPriority(dto.getPriority());

        projectRepository.save(project);
        return ApiResponse.success(new ProjectUpdateDto(project), "project-updated");
    }

    public void updateHiddenFlags() {
        List<Project> completedProjects = projectQuery.getDoneProjects();

        for (Project project : completedProjects) {
            if (project.getCompletedAt() != null &&
                    project.getCompletedAt().isBefore(LocalDateTime.now().minusDays(30))) {
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
            GitHubRepoService.GitHubRepoInfo info = gitHubRepoService.fetchRepoInfo(dto.getRepoUrl(), tokenOpt.get());

            project.setRepoLink(dto.getRepoUrl());
            project.setRepoOwner(info.owner());
            project.setRepoName(info.repo());
            project.setDefaultBranch(info.defaultBranch());

            projectRepository.save(project);
            return ApiResponse.success(null, "Repo linked successfully");

        } catch (IllegalStateException e) {
            if ("GITHUB_TOKEN_EXPIRED".equals(e.getMessage())) {
                return ApiResponse.errorServer("please-login-github-again");
            }
            return ApiResponse.errorServer("Unexpected error");
        } catch (IOException | IllegalArgumentException e) {
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
        dto.setPriority(project.getPriority().toString());

        if (project.getDocument() != null) {
            dto.setDocumentId(project.getDocument().getId());
        }

        if (project.getDocument() != null &&
                project.getDocument().getReceiver() != null &&
                project.getDocument().getReceiver().getEmployee() != null) {
            var emp = project.getDocument().getReceiver().getEmployee();
            dto.setPmName(emp.getFirstName() + " " + emp.getLastName());
        }

        int total = project.getTasks() != null ? project.getTasks().size() : 0;
        int done = project.getTasks() != null
                ? (int) project.getTasks().stream().filter(t -> t.getStatus().toString().equals("COMPLETED")).count()
                : 0;

        dto.setTotalTask(total);
        dto.setDoneTask(done);
        dto.setProgress(total == 0 ? 0 : (int) ((done * 100.0f) / total));
        dto.setCompletedAt(project.getCompletedAt());

        if (project.getTasks() != null) {
            dto.setTasks(project.getTasks().stream()
                    .map(this::toTaskDto)
                    .collect(Collectors.toList()));
        }

        return dto;
    }

    private TaskDto toTaskDto(Task task) {
        TaskDto dto = new TaskDto();

        dto.setId(task.getId());
        dto.setName(task.getName());
        dto.setDescription(task.getDescription());
        dto.setDeadline(task.getDeadline());
        dto.setStatus(task.getStatus().toString());



        dto.setTotalSubtasks(task.getSubTasks() != null ? task.getSubTasks().size() : 0);
        dto.setDoneSubtasks(
                task.getSubTasks() != null
                        ? (int) task.getSubTasks().stream()
                        .filter(sub -> sub.getStatus() == SubTaskStatus.COMPLETED)
                        .count()
                        : 0
        );

        return dto;
    }
}