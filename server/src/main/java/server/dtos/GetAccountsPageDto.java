package server.dtos;

import lombok.Data;

@Data
public class GetAccountsPageDto {
    private int pageNumber;
    private String searchTerm;
    private String roleFilter;
    private String statusFilter;
    private String sortBy;
}
