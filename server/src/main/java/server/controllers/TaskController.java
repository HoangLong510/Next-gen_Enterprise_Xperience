package server.controllers;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import server.dtos.CreateTaskDto;
import server.dtos.TaskDto;
import server.dtos.UpdateTaskDto;
import server.models.enums.TaskSize;
import server.models.enums.TaskStatus;
import server.services.TaskOrderService;
import server.services.TaskService;
import server.utils.ApiResponse;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;
    private final TaskOrderService taskOrderService;

    @PostMapping
    public ApiResponse<?> createTask(@RequestBody CreateTaskDto dto) {
        return taskService.createTask(dto);
    }

    @GetMapping("/statuses")
    public ApiResponse<List<String>> getTaskStatuses() {
        List<String> statuses = Arrays.stream(TaskStatus.values())
                .map(Enum::name)
                .collect(Collectors.toList());
        return ApiResponse.success(statuses, "fetched-statuses");
    }

    @PutMapping("/{id}/status")
    public ApiResponse<?> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String,String> body,
            HttpServletRequest request
    ) {
        String newStatus = body.get("status");
        return taskService.updateTaskStatus(id, newStatus, request);
    }

    @GetMapping("/sizes")
    public ApiResponse<List<String>> getTaskSizes() {
        return ApiResponse.success(
                Arrays.stream(TaskSize.values()).map(Enum::name).toList(),
                "fetched-sizes"
        );
    }

    @PutMapping("/{id}")
    public ApiResponse<?> updateTask(
            @PathVariable Long id,
            @RequestBody UpdateTaskDto dto,
            HttpServletRequest request
    ) {
        return taskService.updateTask(id, dto, request);
    }

    @GetMapping("/search")
    public ApiResponse<List<TaskDto>> searchTasks(@RequestParam String keyword) {
        return taskService.search(keyword);
    }

    @GetMapping("/filter")
    public ApiResponse<List<TaskDto>> filterTasks(@RequestParam(required = false) String status) {
        return taskService.filter(status);
    }
    // ⬇️ Kanban Tasks: cho ADMIN, MANAGER, PM, HOD, EMPLOYEE
    // Service sẽ tự lọc theo role (EMP/HOD chỉ thấy task của họ trong projects đủ điều kiện)
    @PreAuthorize("hasAnyAuthority('ADMIN','MANAGER','PM','HOD','EMPLOYEE')")

    @GetMapping("/kanban")
    public ApiResponse<List<TaskDto>> getKanbanTasks(
            @RequestParam Long projectId,
            HttpServletRequest request
    ) {
        return taskService.getKanbanTasks(projectId, request);
    }

    @PutMapping("/kanban/order")
    public ApiResponse<?> updateKanbanOrder(
            @RequestBody List<Long> orderedTaskIds,
            HttpServletRequest request
    ) {
        String auth = request.getHeader(HttpHeaders.AUTHORIZATION);
        taskOrderService.updateOrder(orderedTaskIds, auth);
        return ApiResponse.success(null, "order-updated");
    }

    @GetMapping("/visible")
    public ApiResponse<List<TaskDto>> getAllVisible() {
        return taskService.getAllVisible();
    }
}
