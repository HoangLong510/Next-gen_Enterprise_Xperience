package server.dtos;

import lombok.Data;

@Data
public class GetAttendancePageDto {
    private int pageSize;
    private int pageNumber;
    private String sortBy;        // "asc" | "desc"
    private String statusFilter;  // AttendanceStatus
    private String fromDate;      // yyyy-MM-dd
    private String toDate;        // yyyy-MM-dd
    private String searchTerm;    // từ khoá
    private Long accountId;
}
