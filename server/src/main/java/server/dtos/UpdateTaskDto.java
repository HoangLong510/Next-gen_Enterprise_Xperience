package server.dtos;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

import java.time.LocalDate;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UpdateTaskDto {
    private String name;         // optional
    private String description;  // optional
    private String size;         // optional (SMALL/MEDIUM/LARGE ... hoặc String như bạn đang dùng)
    private Long assigneeId;     // optional

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate deadline;  // optional (không @FutureOrPresent ở DTO update)
}
