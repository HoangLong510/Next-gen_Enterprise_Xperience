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
    @PreAuthorize("hasAnyAuthority('ADMIN', 'MANAGER')")
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

    // Xem tất cả document (ADMIN, MANAGER)
    @GetMapping
    @PreAuthorize("hasAnyAuthority('ADMIN', 'MANAGER')")
    public ResponseEntity<?> getAllDocuments() {
        var docs = documentService.getAllDocuments();
        return ResponseEntity.ok(ApiResponse.success(docs, "Fetched documents successfully"));
    }
    @GetMapping("/my")
    @PreAuthorize("hasAnyAuthority('PM', 'ACCOUNTANT', 'HOD')") // thêm role phù hợp nếu cần
    public ResponseEntity<?> getMyDocuments() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        var user = (UserDetails) auth.getPrincipal();
        var docs = documentService.getDocumentsByReceiver(user.getUsername());
        return ResponseEntity.ok(ApiResponse.success(docs, "Fetched your documents successfully"));
    }

    // Xem chi tiết document (ADMIN, MANAGER, PM)
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'MANAGER', 'PM','ACCOUNTANT')")
    public ResponseEntity<?> getDetail(@PathVariable Long id) {
        var doc = documentService.getDocumentById(id);
        return ResponseEntity.ok(ApiResponse.success(doc, "Fetched document detail"));
    }

    @GetMapping("/download/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'MANAGER', 'PM','ACCOUNTANT')")
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

}
