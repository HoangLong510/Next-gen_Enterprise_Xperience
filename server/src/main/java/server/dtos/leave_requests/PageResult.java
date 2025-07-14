package server.dtos.leave_requests;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class PageResult<T> {
    private List<T> items;
    private int totalPages;
    private long totalElements;
    private int currentPage;
}
