package server.dtos;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class ProfileDto {
    private String username;
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private String address;
    private LocalDate dateBirth;
    private String gender;
    private String role;
    private String avatar;
    private LocalDateTime createdAt;
}
