package server.dtos;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;
import server.models.enums.PhaseStatus;

import java.time.LocalDate;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UpdatePhaseDto {
    private String name;               // optional

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate deadline;        // optional

    private PhaseStatus status;        // optional
}
