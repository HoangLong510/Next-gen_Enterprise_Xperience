package server.controllers;

import lombok.RequiredArgsConstructor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import server.dtos.DocumentRequestDto;
import server.dtos.DocumentResponseDto;
import server.dtos.GetDocumentHistoryPageDto;
import server.dtos.GetDocumentsPageDto;
import server.models.Document;
import server.services.DocumentService;
import server.utils.ApiResponse;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;

@RestController
@RequestMapping("/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;

    @PostMapping("/create")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'MANAGER','SECRETARY')")
    public ResponseEntity<?> create(@RequestBody DocumentRequestDto request) throws IOException {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getPrincipal() == null) {
            return ResponseEntity.status(401).body(ApiResponse.unauthorized());
        }
        var user = (UserDetails) auth.getPrincipal();
        var createdBy = user.getUsername();

        var data = documentService.createDocument(request, createdBy);
        var response = ApiResponse.created(data, "Document created successfully");
        return ResponseEntity.status(response.getStatus()).body(response);
    }
    // Xem chi tiết document (ADMIN, MANAGER, PM)
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'MANAGER', 'PM','ACCOUNTANT','SECRETARY')")
    public ResponseEntity<?> getDetail(@PathVariable Long id) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        var doc = documentService.getDocumentById(id, username);
        return ResponseEntity.ok(ApiResponse.success(doc, "Fetched document detail"));
    }

    @GetMapping("/{id}/preview")
    @PreAuthorize("hasAnyAuthority('ADMIN','MANAGER','SECRETARY','ACCOUNTANT','PM','HOD')")
    public ResponseEntity<?> previewDocument(@PathVariable Long id) throws IOException {
        Document doc = documentService.getDocumentEntityById(id);
        String html = documentService.convertDocxToHtml(doc.getFileUrl());
        return ResponseEntity.ok(ApiResponse.success(html, "Document preview"));
    }

    @PostMapping("/{id}/sign")
    @PreAuthorize("hasAnyAuthority('MANAGER')")
    public ResponseEntity<?> signDocument(@PathVariable Long id, @RequestBody Map<String, String> req) throws IOException {
        String signature = req.get("signature");
        DocumentResponseDto dto = documentService.signDocument(id, signature);
        return ResponseEntity.ok(ApiResponse.success(dto, "Đã ký công văn"));
    }

    @GetMapping("/download/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'MANAGER', 'PM','ACCOUNTANT','SECRETARY')")
    public ResponseEntity<Resource> downloadFile(@PathVariable Long id) throws IOException {
        Document doc = documentService.getDocumentEntityById(id);
        String fileUrl = doc.getFileUrl();

        if (fileUrl == null) return ResponseEntity.notFound().build();

        Path filePath = Paths.get(documentService.getUploadFolder()).toAbsolutePath().resolve(fileUrl.replace("/uploads/", ""));

        if (!Files.exists(filePath)) return ResponseEntity.notFound().build();

        Resource resource = new UrlResource(filePath.toUri());

        String fileName = filePath.getFileName().toString();

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.wordprocessingml.document"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                .body(resource);
    }

    @PostMapping("/get-documents-page")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'MANAGER','SECRETARY')")
    public ResponseEntity<?> getDocumentsPage(@RequestBody GetDocumentsPageDto req) {
        try {
            ApiResponse<?> response = documentService.getDocumentsPage(req);
            return ResponseEntity.status(response.getStatus()).body(response);
        } catch (Exception e) {
            ApiResponse<?> response = ApiResponse.errorServer(e.getMessage());
            return ResponseEntity.status(response.getStatus()).body(response);
        }
    }

    // PM/ACCOUNTANT/HOD: chỉ lấy document của mình
    @PostMapping("/my/get-documents-page")
    @PreAuthorize("hasAnyAuthority('PM', 'ACCOUNTANT', 'HOD')")
    public ResponseEntity<?> getMyDocumentsPage(@RequestBody GetDocumentsPageDto req) {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        var user = (UserDetails) auth.getPrincipal();
        try {
            ApiResponse<?> response = documentService.getMyDocumentsPage(req, user.getUsername());
            return ResponseEntity.status(response.getStatus()).body(response);
        } catch (Exception e) {
            ApiResponse<?> response = ApiResponse.errorServer(e.getMessage());
            return ResponseEntity.status(response.getStatus()).body(response);
        }
    }

    // --- MANAGER ghi chú (NOTE) khi NEW
    @PutMapping("/{id}/note")
    @PreAuthorize("hasAnyAuthority('MANAGER')")
    public ResponseEntity<?> addNote(@PathVariable Long id, @RequestBody Map<String, String> body) {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        var user = (UserDetails) auth.getPrincipal();
        String note = body.getOrDefault("note", "");
        var dto = documentService.addManagerNote(id, note, user.getUsername());
        return ResponseEntity.ok(ApiResponse.success(dto, "Đã lưu ghi chú của giám đốc"));
    }

    // --- SECRETARY chỉnh sửa khi NEW (tự động snapshot vào history)
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN','SECRETARY')")
    public ResponseEntity<?> updateDocument(@PathVariable Long id, @RequestBody DocumentRequestDto req) throws IOException {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        var user = (UserDetails) auth.getPrincipal();
        var dto = documentService.updateDocumentWithHistory(id, req, user.getUsername());
        return ResponseEntity.ok(ApiResponse.success(dto, "Đã cập nhật công văn & lưu lịch sử"));
    }

    // --- Xem lịch sử của 1 document (ADMIN, MANAGER, SECRETARY, PM, ACCOUNTANT, HOD...)
    @PostMapping("/{id}/histories")
    @PreAuthorize("hasAnyAuthority('ADMIN','MANAGER','SECRETARY')")
    public ResponseEntity<?> getHistories(@PathVariable Long id, @RequestBody GetDocumentHistoryPageDto req) {
        ApiResponse<?> response = documentService.getDocumentHistoriesPage(id, req);
        return ResponseEntity.status(response.getStatus()).body(response);
    }

}
