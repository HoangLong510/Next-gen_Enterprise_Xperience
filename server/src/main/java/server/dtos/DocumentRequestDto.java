package server.dtos;

import lombok.Data;
import server.models.enums.DocumentType;

@Data
public class DocumentRequestDto {
    private String title;
    private String content;
    private String fileUrl;
    private Long receiverId;
    private DocumentType type;
}
