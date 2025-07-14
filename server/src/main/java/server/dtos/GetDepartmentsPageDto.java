package server.dtos;

import lombok.Data;

@Data
public class GetDepartmentsPageDto {
    private int pageNumber;
    private String searchTerm;
}
