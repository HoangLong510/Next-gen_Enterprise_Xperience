package server.dtos;

import lombok.Data;
import server.models.enums.DocumentStatus;

import java.time.LocalDateTime;

@Data
public class DocumentResponseDto {
    private Long id;
    private String title;
    private String content;
    private String fileUrl;
    private String createdBy;
    private String projectManager;
    private Long relatedProjectId;
    private LocalDateTime createdAt;
    private DocumentStatus status;
    private byte[] file;
}
