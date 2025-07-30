package server.dtos.accountant.fund.salary;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

@Data
@AllArgsConstructor
@Builder
public class EmployeeBasicInfoDTO {
    private String name;
    private int age;
    private String birthday;
    private String department;
    private String phone;
    private String email;
    private String avatar;
}
