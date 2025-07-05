package server.dtos;

import lombok.Data;

@Data
public class DocumentRequestDto {
    private String title;
    private String content;
    private String fileUrl;
    private Long projectManagerId;
}
