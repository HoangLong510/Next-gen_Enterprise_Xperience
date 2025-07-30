package server.controllers;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
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

    // Lấy tất cả dự án đang hoạt động (không ẩn)
    @GetMapping
    public ApiResponse<List<ProjectDto>> getAllVisible() {
        return projectService.getAllVisible();
    }
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
    @GetMapping("/search")
    public ApiResponse<List<ProjectDto>> search(@RequestParam("keyword") String keyword) {
        return projectService.search(keyword);
    }

    // Lọc dự án theo trạng thái và độ ưu tiên
    @GetMapping("/filter")
    public ApiResponse<List<ProjectDto>> filter(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String priority
    ) {
        return projectService.filter(status, priority);
    }

    // Cập nhật thông tin dự án
    @PutMapping("/{id}")
    public ApiResponse<?> updateProject(@PathVariable Long id,
                                        @RequestBody @Valid UpdateProjectDto dto) {
        return projectService.updateProject(id, dto);
    }

    // Xoá hoặc huỷ dự án
    @DeleteMapping("/{id}")
    public ApiResponse<?> deleteProject(@PathVariable Long id) {
        return projectService.deleteProject(id);
    }

    // Tạo mới dự án từ tài liệu được duyệt
    @PostMapping
    public ApiResponse<?> createProject(@RequestBody @Valid CreateProjectDto dto,
                                        HttpServletRequest request) {
        return projectService.createProject(dto, request);
    }

    // Gắn GitHub repository cho dự án
    @PostMapping("/{id}/repo")
    public ApiResponse<?> linkRepo(@PathVariable Long id,
                                   @RequestBody RepoRequestDto dto,
                                   HttpServletRequest request) {
        return projectService.linkRepo(id, dto, request);
    }
}