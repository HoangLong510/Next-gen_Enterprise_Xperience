package server.dtos;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class CreateTaskDto {

    @NotBlank(message = "Tên task không được để trống")
    @Size(max = 255, message = "Tên task tối đa 255 ký tự")
    private String name;

    @NotBlank(message = "Mô tả task không được để trống")
    @Size(max = 2000, message = "Mô tả tối đa 2000 ký tự")
    private String description;

    @NotBlank(message = "Size là bắt buộc")
    @Pattern(regexp = "(?i)S|M|L", message = "Size phải là S, M hoặc L")
    private String size;

    @NotNull(message = "Deadline không được để trống")
    @FutureOrPresent(message = "Deadline phải là hôm nay hoặc tương lai")
    private LocalDate deadline;
    private Long assigneeId;
    @NotNull(message = "Phase ID là bắt buộc")
    private Long phaseId;
}
