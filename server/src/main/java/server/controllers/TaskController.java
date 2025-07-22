package server.controllers;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import server.dtos.CreateTaskDto;
import server.utils.ApiResponse;
import server.services.TaskService;

@RestController
@RequestMapping("/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;

    @PostMapping
    public ApiResponse<?> createTask(@RequestBody CreateTaskDto dto) {
        return taskService.createTask(dto);
    }

    @GetMapping("/search")
    public ApiResponse<?> searchTasks(@RequestParam String keyword) {
        return taskService.search(keyword);
    }

    @GetMapping("/filter")
    public ApiResponse<?> filterTasks(@RequestParam(required = false) String status) {
        return taskService.filter(status);
    }

    @GetMapping("/visible")
    public ApiResponse<?> getVisibleTasks() {
        return taskService.getAllVisible();
    }
}