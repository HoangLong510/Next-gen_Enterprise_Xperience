package server.dtos;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
public class TaskDto {
    private Long id;
    private String name;
    private String description;   // 🆕 Thêm mô tả task
    private LocalDate deadline;
    private String status;
    private Long phaseId;
    private String size;
    private boolean hidden;
    private int totalSubtasks;
    private int doneSubtasks;
    private Long assigneeId;     // 👈 thêm
    private String assigneeName;
    private String assigneeUsername;   // account.username
    private String githubBranch;
    private Boolean branchCreated;
    private String pullRequestUrl;
    private Boolean merged;
    private LocalDateTime mergedAt;

}