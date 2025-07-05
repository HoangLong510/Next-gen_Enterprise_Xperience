package server.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ChangePasswordDto {
    @NotBlank(message = "password-is-required")
    private String password;
    @NotBlank(message = "password-is-required")
    @Size(min = 6, max = 30, message = "password-must-be-between-6-and-30-characters")
    private String newPassword;
    @NotBlank(message = "confirm-password-is-required")
    private String confirmNewPassword;
}
