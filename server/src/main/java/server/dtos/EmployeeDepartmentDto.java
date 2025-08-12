package server.dtos;

import lombok.Data;

@Data
public class EmployeeDepartmentDto {
    private Long id;
    private String username;
    private String firstName;
    private String lastName;
    private String fullName;
    private String email;
    private String phone;
    private String address;
    private String avatar;
    private boolean inDepartment;
}
