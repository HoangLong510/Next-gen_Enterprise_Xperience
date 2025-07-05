package server.services;

import lombok.RequiredArgsConstructor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import server.dtos.DocumentRequestDto;
import server.dtos.DocumentResponseDto;
import server.models.*;
import server.models.enums.DocumentStatus;
import server.models.enums.NotificationType;
import server.repositories.*;

import java.io.ByteArrayOutputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final AccountRepository accountRepository;
    private final NotificationService notificationService;

    public DocumentResponseDto createDocument(DocumentRequestDto request, String createdByUsername) throws IOException {
        Account creator = accountRepository.findByUsername(createdByUsername)
                .orElseThrow(() -> new IllegalArgumentException("Creator not found"));

        Account projectManager = accountRepository.findById(request.getProjectManagerId())
                .orElseThrow(() -> new IllegalArgumentException("Project manager not found"));

        Document doc = Document.builder()
                .title(request.getTitle())
                .content(request.getContent())
                .fileUrl(null) // sẽ cập nhật sau khi sinh file word
                .createdBy(creator)
                .projectManager(projectManager)
                .createdAt(LocalDateTime.now())
                .status(DocumentStatus.NEW)
                .build();

        Document saved = documentRepository.save(doc);

        // ==== SINH FILE WORD ====
        Map<String, String> placeholders = new HashMap<>();
        placeholders.put("soVanBan", saved.getId().toString());
        placeholders.put("tenDonVi", creator.getUsername());
        placeholders.put("nguoiNhan", projectManager.getUsername());
        placeholders.put("noiDung", saved.getContent());
        placeholders.put("ngayTao", saved.getCreatedAt().toString());

        byte[] wordFile = exportDocumentToWord(placeholders); // gọi hàm đã viết ở service

        // Lưu file ra server (ví dụ: /data/documents/congvan_{id}.docx)
        String filePath = "/data/documents/congvan_" + saved.getId() + ".docx";
        try (FileOutputStream fos = new FileOutputStream(filePath)) {
            fos.write(wordFile);
            // Cập nhật lại fileUrl trong document
            saved.setFileUrl(filePath);
            documentRepository.save(saved);
        } catch (IOException e) {
            e.printStackTrace();
            // Có thể log hoặc xử lý lỗi ghi file nếu cần
        }

        // ==== END SINH FILE WORD ====

        // Gửi notification cho project manager
        notificationService.createNotification(NotificationType.DOCUMENT, saved.getId());
        DocumentResponseDto responseDto = mapToResponse(saved);
        responseDto.setFile(wordFile);
        return responseDto;
    }


    public List<DocumentResponseDto> getAllDocuments() {
        return documentRepository.findAll()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<DocumentResponseDto> getDocumentsByProjectManager(String pmUsername) {
        Account pm = accountRepository.findByUsername(pmUsername)
                .orElseThrow(() -> new IllegalArgumentException("Project Manager not found"));
        return documentRepository.findByProjectManager(pm)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public DocumentResponseDto getDocumentById(Long id) {
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Document not found"));
        return mapToResponse(doc);
    }

    private DocumentResponseDto mapToResponse(Document doc) {
        DocumentResponseDto dto = new DocumentResponseDto();
        dto.setId(doc.getId());
        dto.setTitle(doc.getTitle());
        dto.setContent(doc.getContent());
        dto.setFileUrl(doc.getFileUrl());
        dto.setCreatedBy(doc.getCreatedBy().getUsername());
        dto.setProjectManager(doc.getProjectManager().getUsername());
        dto.setCreatedAt(doc.getCreatedAt());
        dto.setStatus(doc.getStatus());
        return dto;
    }

    public byte[] exportDocumentToWord(Map<String, String> data) throws IOException {
        InputStream templateInputStream = new ClassPathResource("templates/template.docx").getInputStream();
        XWPFDocument document = new XWPFDocument(templateInputStream);

        for (XWPFParagraph p : document.getParagraphs()) {
            String text = p.getText();
            if (text != null) {
                for (String key : data.keySet()) {
                    String placeholder = "{{" + key + "}}";
                    if (text.contains(placeholder)) {
                        text = text.replace(placeholder, data.get(key));
                    }
                }
                // Xóa hết run cũ
                int runCount = p.getRuns().size();
                for (int i = runCount - 1; i >= 0; i--) {
                    p.removeRun(i);
                }
                // Tạo run mới với text đã thay thế
                XWPFRun run = p.createRun();
                run.setText(text);
            }
        }

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        document.write(baos);
        document.close();
        return baos.toByteArray();
    }


}
