package server.dtos.bank;

import lombok.*;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TopupBulkResponse {
    private String mode;
    private int count;
    private List<TopupItemDTO> items;
}
