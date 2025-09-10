package server.controllers;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import server.dtos.*;
import server.services.ProjectService;
import server.services.QuickTaskService;
import server.services.UploadFileService;
import server.utils.ApiResponse;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;
    private final QuickTaskService quickTaskService;
    private final UploadFileService uploadFileService;

    @PreAuthorize("hasAnyAuthority('ADMIN','MANAGER','PM')")
    @GetMapping
    public ApiResponse<List<ProjectDto>> getAllVisible(HttpServletRequest request) {
        return projectService.getAllVisible(request);
    }
    @PreAuthorize("""
      hasAnyAuthority('ADMIN','MANAGER') or
      (hasAuthority('PM') and @projectService.isProjectManager(#id, authentication.name))
    """)
    // Lấy chi tiết dự án
    @GetMapping("/{id}")
    public ApiResponse<ProjectDto> getProjectDetail(@PathVariable Long id) {
        return projectService.getProjectDetail(id);
    }

    // Lấy các dự án đã hoàn tất
    @GetMapping("/done")
    public ApiResponse<List<ProjectDto>> getDoneProjects() {
        return projectService.getDoneProjects();
    }

    // Tìm kiếm dự án theo từ khoá
// ProjectController.java
    @PreAuthorize("hasAnyAuthority('ADMIN','MANAGER','PM')")
    @GetMapping("/search")
    public ApiResponse<List<ProjectDto>> search(
            HttpServletRequest request,
            @RequestParam("keyword") String keyword
    ) {
        return projectService.search(request, keyword);
    }

    // Lọc dự án theo trạng thái và độ ưu tiên
    @GetMapping("/filter")
    public ApiResponse<List<ProjectDto>> filter(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String priority
    ) {
        return projectService.filter(status, priority);
    }

    // Tạo mới dự án từ tài liệu được duyệt
    @PostMapping
    public ApiResponse<?> createProject(
            @RequestBody @Valid CreateProjectDto dto,
            HttpServletRequest request
    ) {
        return projectService.createProject(dto, request);
    }

    @PreAuthorize("""
  hasAnyAuthority('ADMIN','MANAGER') or
  (hasAuthority('PM') and @projectService.isProjectManager(#projectId, authentication.name))
""")
    @PostMapping("/{projectId}/quick-task")
    public ApiResponse<TaskDto> createQuickTask(
            @PathVariable Long projectId,
            @RequestBody(required = false) QuickTaskRequest req
    ) {
        String overrideName = (req != null) ? req.getName() : null;
        String overrideDescription = (req != null) ? req.getDescription() : null;
        String overrideImageUrl = (req != null) ? req.getImageUrl() : null;
        return quickTaskService.createFromProject(projectId, overrideName, overrideDescription, overrideImageUrl);
    }

    @PreAuthorize("""
  hasAnyAuthority('ADMIN','MANAGER') or
  (hasAuthority('PM') and @projectService.isProjectManager(#projectId, authentication.name))
""")
    @PostMapping("/{projectId}/quick-tasks")
    public ApiResponse<List<TaskDto>> createQuickTasksBulk(
            @PathVariable Long projectId,
            @RequestBody(required = false) QuickTaskBulkRequest req
    ) {
        String overrideName = (req != null) ? req.getName() : null;
        String overrideDescription = (req != null) ? req.getDescription() : null;
        String overrideImageUrl = (req != null) ? req.getImageUrl() : null;
        List<Long> assigneeIds = (req != null) ? req.getAssigneeEmployeeIds() : null;
        List<Long> departmentIds = (req != null) ? req.getDepartmentIds() : null;

        return quickTaskService.createManyFromProject(
                projectId,
                overrideName,
                overrideDescription,
                overrideImageUrl,
                assigneeIds,
                departmentIds
        );
    }

    // Cập nhật thông tin dự án
    @PutMapping("/{id}")
    public ApiResponse<?> updateProject(
            @PathVariable Long id,
            @Valid @RequestBody UpdateProjectDto dto
    ) {
        return projectService.updateProject(id, dto);
    }

    // Xoá hoặc huỷ dự án
    @DeleteMapping("/{id}")
    public ApiResponse<?> deleteProject(@PathVariable Long id) {
        return projectService.deleteProject(id);
    }

    // Gắn GitHub repository cho dự án
    @PostMapping("/{id}/repo")
    public ApiResponse<?> linkRepo(
            @PathVariable Long id,
            @RequestBody RepoRequestDto dto,
            HttpServletRequest request
    ) {
        return projectService.linkRepo(id, dto, request);
    }
    // ProjectController.java
    @PreAuthorize("""
  hasAnyAuthority('ADMIN','MANAGER') or
  (hasAuthority('PM') and @projectService.isProjectManager(#id, authentication.name))
""")

    @GetMapping("/{id}/repo")
    public ApiResponse<?> getProjectRepo(@PathVariable Long id, HttpServletRequest request) {
        return projectService.getProjectRepo(id, request);
    }

    // Lấy danh sách Project cho Kanban Board (Employee)
    @GetMapping("/kanban")
    public ApiResponse<List<ProjectDto>> getKanbanProjects(HttpServletRequest request) {
        return projectService.getKanbanProjects(request);
    }

    @GetMapping("/quick-tasks/departments")
    public ApiResponse<List<DepartmentDto>> getDepartmentsForQuickTasks() {
        return quickTaskService.getDepartments();
    }


    @GetMapping("/quick-tasks/employees/search")
    public ApiResponse<List<AccountDto>> searchEmployeesForQuickTasks(
            @RequestParam(value = "q", required = false) String q,
            @RequestParam(value = "limit", required = false) Integer limit,
            @RequestParam(value = "departmentId", required = false) Long departmentId
    ) {
        return quickTaskService.searchEmployees(q, limit, departmentId);
    }
    @PostMapping("/uploads")
    public ApiResponse<?> uploadPublic(@RequestParam("file") MultipartFile file) {
        try {
            String url = uploadFileService.storeFileFromBytes(
                    "public", file.getOriginalFilename(), file.getBytes()
            );
            return ApiResponse.success(Map.of("url", url), "file-uploaded");
        } catch (IOException e) {
            return ApiResponse.badRequest("upload-failed");
        }
    }
}
