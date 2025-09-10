package server.dtos.bank;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.util.List;

@Data
public class CreateTopupRequest {
    @Min(1)
    private Long amount;

    @NotBlank
    private String bankAccountNo;

    private String description;

    private Boolean perEmployee = true;

    private List<Long> employeeIds;

    private Long employeeId;

    private Integer copies = 1;
}
