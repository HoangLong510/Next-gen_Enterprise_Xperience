package server.dtos.leave_requests;

import lombok.Data;

@Data
public class AccountResponse {
    private Long id;             // Account id
    private String username;     // Account username
    private String role;         // ADMIN, MANAGER, HOD, PM, EMPLOYEE
    private String fullName;     // Employee full name
    private String email;        // Employee email (optional)
}
