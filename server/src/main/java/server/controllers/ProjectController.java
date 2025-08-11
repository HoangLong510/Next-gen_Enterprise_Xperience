package server.controllers;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import server.dtos.CreateProjectDto;
import server.dtos.ProjectDto;
import server.dtos.RepoRequestDto;
import server.dtos.UpdateProjectDto;
import server.services.ProjectService;
import server.utils.ApiResponse;

import java.util.List;

@RestController
@RequestMapping("/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;
    @PreAuthorize("hasAnyAuthority('ADMIN','MANAGER','PM')")
    // Lấy tất cả dự án đang hoạt động (không ẩn)
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
}
