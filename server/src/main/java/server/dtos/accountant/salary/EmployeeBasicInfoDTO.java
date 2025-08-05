package server.dtos.accountant.salary;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

@Data
@AllArgsConstructor
@Builder
public class EmployeeBasicInfoDTO {
    private String code;
    private String name;
    private int age;
    private String birthday;
    private String department;
    private String phone;
    private String email;
    private String avatar;
    private String position;
}

