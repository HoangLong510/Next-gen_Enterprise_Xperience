package server.controllers;

import lombok.RequiredArgsConstructor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import server.dtos.DocumentRequestDto;
import server.services.DocumentService;
import server.utils.ApiResponse;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
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
    // Xem document liên quan PM (PM)
    @GetMapping("/my")
    @PreAuthorize("hasAuthority('PM')")
    public ResponseEntity<?> getMyDocuments() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        var user = (UserDetails) auth.getPrincipal();
        var docs = documentService.getDocumentsByProjectManager(user.getUsername());
        return ResponseEntity.ok(ApiResponse.success(docs, "Fetched your documents successfully"));
    }

    // Xem chi tiết document (ADMIN, MANAGER, PM)
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'MANAGER', 'PM')")
    public ResponseEntity<?> getDetail(@PathVariable Long id) {
        var doc = documentService.getDocumentById(id);
        return ResponseEntity.ok(ApiResponse.success(doc, "Fetched document detail"));
    }

}
