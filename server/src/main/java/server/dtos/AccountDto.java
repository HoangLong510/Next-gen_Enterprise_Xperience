package server.dtos;

import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.Data;
import server.models.enums.AccountStatus;
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
    private LocalDateTime lastActiveAt;

    @Enumerated(EnumType.STRING)
    private AccountStatus status;
}
