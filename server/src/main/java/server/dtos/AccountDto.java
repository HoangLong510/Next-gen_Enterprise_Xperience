package server.dtos;

import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.Data;
import server.models.enums.AccountStatus;
import server.models.enums.Gender;
import server.models.enums.Role;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class AccountDto {
    private Long id;
    private String firstName;
    private String lastName;
    private String username;
    private String email;
    private String phone;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Role role;
    private LocalDate dateBirth;
    private String address;
    private Gender gender;
    private boolean enabled;
    private String avatar;
    private LocalDateTime lastActiveAt;

    @Enumerated(EnumType.STRING)
    private AccountStatus status;
}
