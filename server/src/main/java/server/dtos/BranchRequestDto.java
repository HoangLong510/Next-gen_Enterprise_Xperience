package server.dtos;

import lombok.Data;

@Data
public class BranchRequestDto {
    private Long subTaskId;
    private String branchName;
    private String accessToken; // ✅ Token GitHub của người tạo branch
}