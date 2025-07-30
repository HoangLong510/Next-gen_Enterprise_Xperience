package server.services;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import server.dtos.CreateTaskDto;
import server.dtos.TaskDto;
import server.models.Project;
import server.models.Task;
import server.models.enums.TaskStatus;
import server.repositories.ProjectRepository;
import server.repositories.TaskRepository;
import server.repositories.TaskRepositoryImpl;
import server.utils.ApiResponse;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final TaskRepositoryImpl taskQuery;

    public ApiResponse<?> createTask(CreateTaskDto dto) {
        Project project = projectRepository.findById(dto.getProjectId()).orElse(null);
        if (project == null) {
            return ApiResponse.notfound("project-not-found");
        }

        if (dto.getDeadline().isBefore(LocalDate.now())) {
            return ApiResponse.errorServer("Deadline không được nhỏ hơn ngày hiện tại");
        }

        Task task = Task.builder()
                .name(dto.getName().trim())
                .description(dto.getDescription().trim())
                .deadline(dto.getDeadline())
                .status(TaskStatus.PLANNING)
                .project(project)
                .hidden(false)
                .build();

        taskRepository.save(task);

        return ApiResponse.success(toDto(task), "task-created-successfully");
    }

    public ApiResponse<List<TaskDto>> search(String keyword) {
        updateHiddenFlags();
        List<Task> tasks = taskQuery.searchTasks(keyword);
        return ApiResponse.success(tasks.stream().map(this::toDto).collect(Collectors.toList()), "search-success");
    }

    public ApiResponse<List<TaskDto>> filter(String status) {
        updateHiddenFlags();
        List<Task> tasks = taskQuery.filterByStatus(status);
        return ApiResponse.success(tasks.stream().map(this::toDto).collect(Collectors.toList()), "filter-success");
    }

    public ApiResponse<List<TaskDto>> getAllVisible() {
        updateHiddenFlags();
        List<Task> tasks = taskQuery.getAllVisible();
        return ApiResponse.success(tasks.stream().map(this::toDto).collect(Collectors.toList()), "fetch-visible-tasks");
    }

    public void updateHiddenFlags() {
        List<Task> completedTasks = taskQuery.getCompletedTasks();

        for (Task task : completedTasks) {
            if (task.getDeadline() != null &&
                    task.getDeadline().isBefore(LocalDate.now().minusDays(30))) {

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
        dto.setProjectId(task.getProject().getId());
        dto.setHidden(task.isHidden());
        return dto;
    }
}