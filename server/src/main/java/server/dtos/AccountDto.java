package server.dtos;

import lombok.Data;
import server.models.enums.Role;

import java.time.LocalDateTime;

@Data
public class AccountDto {
    private Long id;
    private String firstName;
    private String lastName;
    private String username;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Role role;
    private boolean enabled;
    private String avatar;
}
