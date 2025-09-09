package server.dtos;

import lombok.*;
import java.util.List;

@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuickTaskBulkRequest {
    private String name;
    private String description;
    private String imageUrl;
    private List<Long> assigneeEmployeeIds;
    private List<Long> departmentIds;
}