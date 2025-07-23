package server.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import server.models.enums.TaskStatus;

import java.time.LocalDate;

@Getter
@Setter
public class CreateTaskDto {

    @NotBlank(message = "Tên task không được để trống")
    private String name;

    @NotBlank(message = "Mô tả task không được để trống")
    private String description; // 🆕 Mô tả task

    @NotNull(message = "Deadline không được để trống")
    private LocalDate deadline;

    @NotNull(message = "Project ID là bắt buộc")
    private Long projectId;
}