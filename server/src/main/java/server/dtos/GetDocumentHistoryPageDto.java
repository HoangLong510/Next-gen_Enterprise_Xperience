package server.dtos;

import lombok.Data;

@Data
public class GetDocumentHistoryPageDto {
    private int pageNumber; // bắt đầu từ 1
    private int pageSize;   // mặc định 10
    private String sortBy;  // "desc" | "asc" (theo createdAt hoặc version)
}
