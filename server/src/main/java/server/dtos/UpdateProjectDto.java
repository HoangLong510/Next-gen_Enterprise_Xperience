package server.dtos;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import server.models.enums.ProjectPriority;

import java.time.LocalDate;

@Data
public class UpdateProjectDto {

    @NotBlank(message = "Project name must not be blank")
    private String name;

    @NotBlank(message = "Project description must not be blank")
    private String description;

    @NotNull(message = "Deadline is required")
    @FutureOrPresent(message = "Deadline must be today or in the future")
    private LocalDate deadline;

    @NotNull(message = "Priority is required")
    private ProjectPriority priority;
}