package server.dtos;

import lombok.Data;

@Data
public class ProjectEmployeeDto {
    private Long id;
    private String firstName;
    private String lastName;
    private String avatar;
    private String email;
    private String phone;
    private String departmentName;
    private String username;
    private String role;
    private boolean canRemove; // dùng cho trang View — chỉ xoá nếu chưa gán SubTask
}