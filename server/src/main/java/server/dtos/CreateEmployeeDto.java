package server.dtos;

import jakarta.validation.constraints.*;
import lombok.Data;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;

@Data
public class CreateEmployeeDto {
    private Long id;

    @NotBlank(message = "first-name-is-required")
    @Size(min = 2, max = 30, message = "first-name-must-be-between-2-and-30-characters")
    @Pattern(regexp = "^[\\p{L}\\s]+$", message = "first-name-must-contain-only-letters-and-spaces")
    private String firstName;

    @NotBlank(message = "last-name-is-required")
    @Size(min = 2, max = 30, message = "last-name-must-be-between-2-and-30-characters")
    @Pattern(regexp = "^[\\p{L}\\s]+$", message = "last-name-must-contain-only-letters-and-spaces")
    private String lastName;

    @NotBlank(message = "email-is-required")
    @Email(message = "invalid-email-address")
    private String email;

    @NotBlank(message = "phone-is-required")
    @Pattern(
        regexp = "^(0|\\+84)(3[2-9]|5[6|8|9]|7[0|6-9]|8[1-5]|9[0-9])[0-9]{7}$",
        message = "invalid-phone-number"
    )
    private String phone;

    @NotBlank(message = "address-is-required")
    private String address;

    @NotBlank(message = "gender-is-required")
    @Pattern(
        regexp = "^(MALE|FEMALE|OTHER)$",
        message = "invalid-gender"
    )
    private String gender;

    @DateTimeFormat(pattern = "yyyy-MM-dd")
    @NotNull(message = "date-of-birth-cannot-be-null")
    @Past(message = "date-of-birth-must-be-in-the-past")
    private LocalDate dateBirth;

    @NotBlank(message = "role-is-required")
    @Pattern(
        regexp = "^(ADMIN|MANAGER|PM|HR|ACCOUNTANT|HOD|EMPLOYEE|CHIEFACCOUNTANT)$",
        message = "invalid-role"
    )
    private String role;
}
