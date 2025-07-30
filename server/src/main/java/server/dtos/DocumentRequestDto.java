package server.dtos;

import lombok.Data;
import server.models.enums.DocumentType;
import server.models.enums.ProjectPriority;

import java.time.LocalDate;

@Data
public class DocumentRequestDto {
    private String title;
    private String content;
    private String fileUrl;
    private Long receiverId;
    private DocumentType type;
    private String projectName;
    private String projectDescription;
    private LocalDate projectDeadline;
    private ProjectPriority projectPriority;
    private Long pmId;
    private String fundName;
    private Double fundBalance;
    private String fundPurpose;
}
