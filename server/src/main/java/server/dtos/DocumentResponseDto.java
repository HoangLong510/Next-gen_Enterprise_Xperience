package server.dtos;

import lombok.Data;
import server.models.enums.DocumentStatus;
import server.models.enums.DocumentType;

import java.time.LocalDateTime;

@Data
public class DocumentResponseDto {
    private Long id;
    private String title;
    private String content;
    private String fileUrl;
    private String createdBy;
    private String receiver;
    private Long relatedProjectId;
    private LocalDateTime createdAt;
    private DocumentStatus status;
    private DocumentType type;
    private byte[] file;
    private String signature;
}
