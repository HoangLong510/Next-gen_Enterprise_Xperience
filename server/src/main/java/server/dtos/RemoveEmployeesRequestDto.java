package server.dtos;

import lombok.Data;
import java.util.List;

@Data
public class RemoveEmployeesRequestDto {
    private Long projectId;
    private List<Long> employeeIds;
}