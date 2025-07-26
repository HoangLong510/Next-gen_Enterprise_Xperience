package server.dtos;

import lombok.Data;

@Data
public class
RepoRequestDto {
    private Long projectId;
    private String repoUrl;
}