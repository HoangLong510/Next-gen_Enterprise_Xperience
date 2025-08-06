package server.dtos;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class TaskDto {
    private Long id;
    private String name;
    private String description;   // 🆕 Thêm mô tả task
    private LocalDate deadline;
    private String status;
    private Long projectId;
    private boolean hidden;
    private int totalSubtasks;
    private int doneSubtasks;

}