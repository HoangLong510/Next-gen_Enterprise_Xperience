package server.dtos;

import lombok.Data;

@Data
public class GetDocumentsPageDto {
    private int pageNumber; // Trang hiện tại (bắt đầu từ 1)
    private int pageSize;   // Số lượng bản ghi/trang
    private String sortBy;  // "desc" hoặc "asc"
    private String statusFilter; // VD: "NEW", "APPROVED", ...
    private String typeFilter;   // VD: "PROJECT", "ADMINISTRATIVE"
    private String searchTerm;   // Từ khóa tìm kiếm title hoặc content
}