package server.dtos;

import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskDto {
    private Long id;
    private String name;
    private String description;
    private String imageUrl;
    private LocalDate deadline;
    private String status;
    private Long phaseId;
    private String size;
    private boolean hidden;
    private int totalSubtasks;
    private int doneSubtasks;
    private Long assigneeId;
    private String assigneeName;
    private String assigneeUsername;
    private String githubBranch;
    private Boolean branchCreated;
    private String pullRequestUrl;
    private Boolean merged;
    private LocalDateTime mergedAt;

}