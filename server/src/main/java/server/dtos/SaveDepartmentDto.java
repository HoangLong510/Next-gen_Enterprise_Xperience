package server.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SaveDepartmentDto {
    private Long id;

    @NotBlank(message = "department-name-is-required")
    private String name;

    @NotBlank(message = "department-description-is-required")
    private String description;

    @NotNull(message = "hod-is-required")
    private Long hodId;
}
