package server.dtos;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuickTaskRequest {
    private String name;
    private String description;
    private String imageUrl;
}
