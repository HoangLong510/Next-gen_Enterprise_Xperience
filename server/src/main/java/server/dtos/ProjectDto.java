package server.dtos;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class ProjectDto {
    private Long id;
    private String name;
    private String description;
    private LocalDate createdAt;
    private LocalDate deadline;
    private Long pmId;

    private String status;           // PLANNING, ACTIVE, DONE, etc.
    private String repoLink;
    private String documentCode;
    private Long documentId;     // Linked document code
    private String pmName;           // Full name of the project manager
    private List<TaskDto> tasks;
    private int totalTask;           // Total number of tasks
    private int doneTask;            // Number of completed tasks
    private int progress;            // Progress percentage
    private LocalDateTime completedAt; // Completion date (if DONE)
}