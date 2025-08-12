// server/controllers/TaskEvidenceController.java
package server.controllers;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import server.services.TaskEvidenceService;
import server.utils.ApiResponse;

@RestController
@RequestMapping("/tasks")
@RequiredArgsConstructor
public class TaskEvidenceController {
    private final TaskEvidenceService service;

    @PostMapping(value = "/{id}/evidence", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<?> uploadMany(@PathVariable Long id,
                                     @RequestPart("files") MultipartFile[] files,
                                     HttpServletRequest request) {
        return service.uploadMany(id, files, request);
    }
    @DeleteMapping("/{id}/evidence")
    public ApiResponse<?> clearAll(@PathVariable Long id, HttpServletRequest request) {
        return service.clearAll(id, request);
    }

    @GetMapping("/{id}/evidence")
    public ApiResponse<?> list(@PathVariable Long id) {
        return service.list(id);
    }

    @DeleteMapping("/evidence/{evidenceId}")
    public ApiResponse<?> deleteOne(@PathVariable Long evidenceId, HttpServletRequest request) {
        return service.deleteOne(evidenceId, request);
    }
}
