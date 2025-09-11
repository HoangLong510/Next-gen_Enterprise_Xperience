package server.dtos.Contracts;

import lombok.Data;

@Data
public class EmployeeLiteResponse {
    private Long id;
    private String firstName;
    private String lastName;
    private String fullName;   // tiện FE hiển thị
    private String role;       // lấy từ Account.role
}
