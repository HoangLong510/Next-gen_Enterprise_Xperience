package server.dtos;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class CreatePhaseDto {

    @NotBlank(message = "Tên phase không được để trống")
    private String name;
    @NotNull(message = "Deadline không được để trống")
    @FutureOrPresent(message = "Deadline phải là ngày hiện tại hoặc tương lai")
    private LocalDate deadline;

}
