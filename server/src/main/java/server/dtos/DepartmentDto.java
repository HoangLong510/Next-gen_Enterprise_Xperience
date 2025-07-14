package server.dtos;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;

@Data
public class DepartmentDto {
    private Long id;
    private String name;
    private String description;
    private Map<String, Object> hod;
    private int employeeCount;
    private String image;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
