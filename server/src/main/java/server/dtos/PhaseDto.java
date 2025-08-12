package server.dtos;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class PhaseDto {
    private Long id;
    private String name;
    private LocalDate deadline;
    private String status;
    private Integer sequence;
    private LocalDateTime startedAt;
    private Long projectId;
    private List<TaskDto> tasks;
    private String displayName;
    private Integer progress;

}
