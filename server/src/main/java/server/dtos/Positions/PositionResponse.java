package server.dtos.Positions;

import lombok.Data;

@Data
public class PositionResponse {
    private Long id;
    private String code;
    private String name;
    private String description;
}
