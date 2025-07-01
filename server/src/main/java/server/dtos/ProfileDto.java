package server.dtos;
import lombok.Data;

@Data
public class ProfileDto {
    private String username;
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private String address;
    private String gender;
    private String role;
}
