package server.dtos;

import lombok.Data;
import server.models.enums.DocumentHistoryAction;
import server.models.enums.DocumentStatus;
import server.models.enums.DocumentType;

import java.time.LocalDateTime;

@Data
public class DocumentHistoryDto {
    private Long id;
    private Long documentId;
    private Integer version;
    private DocumentHistoryAction action;

    private String title;
    private String content;
    private String fileUrl;

    private String projectName;
    private String projectDescription;
    private String projectPriority;
    private String projectDeadline;

    private String fundName;
    private Double fundBalance;
    private String fundPurpose;

    private DocumentType type;
    private DocumentStatus status;
    private String signature;

    // Note tại thời điểm lịch sử được tạo
    private String managerNote;

    private LocalDateTime createdAt;

    // Thông tin người tạo lịch sử
    private Long createdById;
    private String createdByUsername;
    private String createdByName; // nếu có employee: "lastName firstName"
    private String createdByRole;
}
