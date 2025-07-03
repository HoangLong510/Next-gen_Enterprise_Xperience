package server.dtos.accountant.fund;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

@Data
public class FundUnlockRequest {
    @NotBlank(message = "reason-is-required")
    private String reason;

    private MultipartFile file;
}
