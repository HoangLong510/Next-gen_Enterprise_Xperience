package server.dtos;

import lombok.Data;

@Data
public class GetEmployeesToAddToDepartmentDto {
    private Long id;
    private String searchTerm;
    private String filterInDepartment;
    private int pageNumber;
}
