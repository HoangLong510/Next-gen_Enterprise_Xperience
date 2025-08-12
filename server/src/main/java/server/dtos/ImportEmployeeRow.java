package server.dtos;

import lombok.*;

import java.util.Map;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class ImportEmployeeRow {
    private int rowIndex; // 1-based như hiển thị trong Excel
    private CreateEmployeeDto data;
    Map<String, String> errors;
}
