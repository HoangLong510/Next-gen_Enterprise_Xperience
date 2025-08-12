// server.controllers.TaskBranchController.java
package server.controllers;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import server.dtos.BranchRequestDto;
import server.services.GitHubBranchService;

@RestController
@RequestMapping("/tasks")
@RequiredArgsConstructor
public class TaskBranchController {

    private final GitHubBranchService gitHubBranchService;

    @PostMapping("/{id}/branch")
    public ResponseEntity<?> createBranch(@PathVariable Long id,
                                          @RequestBody BranchRequestDto dto,
                                          HttpServletRequest request) {
        dto.setTaskId(id);
        return ResponseEntity.ok(gitHubBranchService.createBranch(dto, request));
    }
}
