package server.dtos;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ImportEmployeesResult {
    private int totalRows;
    private int inserted;     // số dòng thực sự được lưu
    private boolean success;  // true nếu không có lỗi nào
    private List<ImportEmployeeRow> rows;   // lỗi chi tiết cho từng dòng
}
