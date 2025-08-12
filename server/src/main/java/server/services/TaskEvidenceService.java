// server/services/TaskEvidenceService.java
package server.services;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import server.models.*;
import server.models.enums.Role;
import server.repositories.*;
import server.utils.ApiResponse;
import server.utils.JwtUtil;

import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class TaskEvidenceService {
    private final TaskRepository taskRepository;
    private final TaskEvidenceRepository evidenceRepository;
    private final AccountRepository accountRepository;
    private final JwtUtil jwtUtil;

    private final String baseDir = "uploads"; // hoặc @Value từ config

    @Transactional
    public ApiResponse<?> uploadMany(Long taskId, MultipartFile[] files, HttpServletRequest req) {
        if (files == null || files.length == 0) return ApiResponse.badRequest("no-files");

        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("task-not-found"));

        String username = jwtUtil.extractUsernameFromRequest(req);
        Account me = accountRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("invalid-account"));

        boolean isAssignee = task.getAssignee()!=null && task.getAssignee().getId().equals(me.getId());
        boolean isPrivileged = Stream.of(Role.PM, Role.MANAGER, Role.ADMIN).anyMatch(r -> r == me.getRole());
        if (!isAssignee && !isPrivileged) return ApiResponse.unauthorized("access-denied");

        Path folder = Paths.get(baseDir, "task-" + task.getId());
        try { Files.createDirectories(folder); } catch (Exception ignored) {}

        for (MultipartFile f : files) {
            try {
                String original = Optional.ofNullable(f.getOriginalFilename())
                        .map(p -> Paths.get(p).getFileName().toString())
                        .orElse("file");
                String unique = UUID.randomUUID() + "_" + original;
                Path target = folder.resolve(unique);
                Files.copy(f.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);

                String publicUrl = "/uploads/task-" + task.getId() + "/" + unique; // <-- URL lưu DB

                evidenceRepository.save(TaskEvidence.builder()
                        .task(task)
                        .uploadedBy(me)
                        .fileName(original)
                        .fileUrl(publicUrl)
                        .contentType(f.getContentType())
                        .size(f.getSize())
                        .uploadedAt(LocalDateTime.now())
                        .build());
            } catch (Exception e) {
                return ApiResponse.errorServer("upload-failed");
            }
        }
        return ApiResponse.success(null, "evidence-uploaded");
    }
    @Transactional
    public ApiResponse<?> clearAll(Long taskId, HttpServletRequest req) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("task-not-found"));

        String username = jwtUtil.extractUsernameFromRequest(req);
        Account me = accountRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("invalid-account"));

        boolean isAssignee = task.getAssignee()!=null && task.getAssignee().getId().equals(me.getId());
        boolean isPrivileged = Stream.of(Role.PM, Role.MANAGER, Role.ADMIN).anyMatch(r -> r == me.getRole());
        if (!isAssignee && !isPrivileged) return ApiResponse.unauthorized("access-denied");

        // Xoá DB + file
        var list = evidenceRepository.findByTaskId(taskId);
        for (var ev : list) {
            try {
                Path p = Paths.get(ev.getFileUrl().replaceFirst("^/+", ""));
                Files.deleteIfExists(p);
            } catch (Exception ignored) {}
        }
        evidenceRepository.deleteByTaskId(taskId);
        return ApiResponse.success(null, "evidence-cleared");
    }

    @Transactional(readOnly = true)
    public ApiResponse<?> list(Long taskId) {
        taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("task-not-found"));
        var data = evidenceRepository.findByTaskId(taskId).stream().map(ev -> Map.of(
                "id", ev.getId(),
                "fileName", ev.getFileName(),
                "url", ev.getFileUrl(),              // FE dùng URL này để preview/download
                "contentType", ev.getContentType(),
                "size", ev.getSize(),
                "uploadedAt", ev.getUploadedAt(),
                "uploadedBy", ev.getUploadedBy()!=null ? ev.getUploadedBy().getUsername() : null
        )).toList();
        return ApiResponse.success(data, "evidence-list");
    }

    @Transactional
    public ApiResponse<?> deleteOne(Long evidenceId, HttpServletRequest req) {
        TaskEvidence ev = evidenceRepository.findById(evidenceId)
                .orElseThrow(() -> new IllegalArgumentException("evidence-not-found"));

        String username = jwtUtil.extractUsernameFromRequest(req);
        Account me = accountRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("invalid-account"));

        Task task = ev.getTask();
        boolean isUploader = ev.getUploadedBy()!=null && ev.getUploadedBy().getId().equals(me.getId());
        boolean isAssignee = task.getAssignee()!=null && task.getAssignee().getId().equals(me.getId());
        boolean isPrivileged = Stream.of(Role.PM, Role.MANAGER, Role.ADMIN).anyMatch(r -> r == me.getRole());
        if (!(isUploader || isAssignee || isPrivileged)) return ApiResponse.unauthorized("access-denied");

        evidenceRepository.delete(ev);
        // Xoá file vật lý (từ URL -> path thật)
        try {
            Path p = Paths.get(ev.getFileUrl().replaceFirst("^/+", "")); // "/uploads/..." -> "uploads/..."
            Files.deleteIfExists(p);
        } catch (Exception ignored) {}
        return ApiResponse.success(null, "evidence-deleted");
    }
}
