package server.dtos;

import lombok.Data;
import server.models.enums.CashAdvanceStatus;
import java.time.LocalDateTime;

@Data
public class CashAdvanceDto {
    private Long id;
    private Long taskId;
    private Long phaseId;
    private Long projectId;
    private String taskName;
    private String phaseName;
    private String projectName;

    private Double amount;
    private String reason;
    private CashAdvanceStatus status;
    private String fileUrl;

    private Long createdById;
    private String createdByUsername;
    private Long approvedById;
    private String approvedByUsername;

    private Long chiefAssigneeId;
    private String chiefAssigneeUsername;

    private Long directorAssigneeId;
    private String directorAssigneeUsername;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private LocalDateTime sentToChiefAt;
    private LocalDateTime chiefApprovedAt;

    private LocalDateTime sentToDirectorAt;
    private LocalDateTime directorApprovedAt;
    private String signatureDataUrl;
    private String chiefSignatureDataUrl;
    private String directorSignatureDataUrl;
    private String rejectNote;
}
