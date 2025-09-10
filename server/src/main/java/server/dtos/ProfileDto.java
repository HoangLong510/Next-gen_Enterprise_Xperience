package server.dtos;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class ProfileDto {
    private Long id;
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
    private String department;
    private LocalDateTime createdAt;

    // ====== NEW: cấu trúc lồng cho FE ======
    private EmployeeNode employee;

    @Data
    public static class EmployeeNode {
        private Long id;
        private DepartmentNode department;
    }

    @Data
    public static class DepartmentNode {
        private Long id;
        private String name;
        private HodNode hod;
    }

    @Data
    public static class HodNode {
        private Long id;          // employeeId của HOD (tham khảo)
        private String firstName;
        private String lastName;
        private String fullName;  // tiện cho FE
        private AccountNode account; // FE cần account.id/role/fullName
    }

    @Data
    public static class AccountNode {
        private Long id;         // accountId của HOD (FE dùng field này)
        private String role;     // MANAGER/HOD/...
        private String fullName; // trùng với HodNode.fullName cho tiện FE
    }
}
