package server.dtos;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;
import server.models.enums.ProjectStatus;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

@Data
public class UpdateProjectDto {

    @NotBlank(message = "Project name must not be blank")
    private String name;

    @NotBlank(message = "Project description must not be blank")
    private String description;

    @NotNull(message = "Deadline is required")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate deadline;     // không @FutureOrPresent ở UPDATE

    @NotNull(message = "Status is required")
    private ProjectStatus status;
}
