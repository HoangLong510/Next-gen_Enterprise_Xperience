package server.controllers;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import server.dtos.BranchRequestDto;
import server.services.GitHubBranchService;

@RestController
@RequestMapping("/subtasks")
@RequiredArgsConstructor
public class SubTaskBranchController {

    private final GitHubBranchService gitHubBranchService;

    @PostMapping("/{id}/branch")
    public ResponseEntity<?> createBranch(@PathVariable Long id,
                                          @RequestBody BranchRequestDto dto,
                                          HttpServletRequest request) {
        dto.setSubTaskId(id); // Gán ID từ URL vào DTO
        return ResponseEntity.ok(gitHubBranchService.createBranch(dto, request));
    }
}