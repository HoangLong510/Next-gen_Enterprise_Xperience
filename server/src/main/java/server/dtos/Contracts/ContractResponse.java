package server.dtos.Contracts;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class ContractResponse {
    private Long id;
    private String contractCode;

    // Employee
    private Long employeeId;
    private String employeeName;      // optional: nếu bạn có fullName thì map
    private String employeeAddress;   // optional
    private String employeePhone;     // optional
    private String employeeGender;    // optional

    private String employeeRole;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate startDate;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate endDate;

    private LocalDateTime createdAt;

    private String type;              // enum name
    private String status;            // enum name
    private String note;

    // Base64 signatures
    private String managerSignature;
    private String employeeSignature;

    private BigDecimal basicSalary;

    // Nếu dự án bạn có field này trước đó bị typo, hãy dùng tên đúng:
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate employeeDateBirth; // (trước đây có thể là employeeDateBrith)
}
