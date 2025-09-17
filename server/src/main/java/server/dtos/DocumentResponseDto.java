package server.dtos;

import lombok.Data;
import server.models.enums.DocumentStatus;
import server.models.enums.DocumentType;
import server.models.enums.ProjectStatus;

import java.time.LocalDateTime;

@Data
public class DocumentResponseDto {
    private Long id;
    private String code;
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
    private String previewHtml;
    private ProjectStatus projectStatus;

    private String projectName;
    private String projectDescription;
    private String projectDeadline; // String yyyy-MM-dd hoặc LocalDate (nếu FE biết convert)
    private String pmName;
    private Long pmId;

    private String fundName;
    private Double fundBalance;
    private String fundPurpose;
    private String accountantName;
    private String managerNote;
}
