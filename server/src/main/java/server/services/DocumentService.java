package server.services;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.apache.poi.xwpf.usermodel.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import server.dtos.DocumentRequestDto;
import server.dtos.DocumentResponseDto;
import server.models.*;
import server.models.Document;
import server.models.enums.DocumentStatus;
import server.models.enums.DocumentType;
import server.models.enums.NotificationType;
import server.models.enums.Role;
import server.repositories.*;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
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
    private final UploadFileService uploadFileService;

    @Getter
    @Value("${app.upload.folder}")
    private String uploadFolder;

    public DocumentResponseDto createDocument(DocumentRequestDto request, String createdByUsername) throws IOException {
        Account creator = accountRepository.findByUsername(createdByUsername)
                .orElseThrow(() -> new IllegalArgumentException("Creator not found"));

        Account receiver = null;

        if (request.getType() == null) {
            throw new IllegalArgumentException("Document type must be specified");
        }

        if (request.getType() == DocumentType.PROJECT) {
            if (request.getReceiverId() == null) {
                throw new IllegalArgumentException("Project Manager must be selected for Project document");
            }
            receiver = accountRepository.findById(request.getReceiverId())
                    .orElseThrow(() -> new IllegalArgumentException("Project Manager not found"));

            if (receiver.getRole() != Role.PM) {
                throw new IllegalArgumentException("Receiver must be a Project Manager for Project documents");
            }
        } else if (request.getType() == DocumentType.ADMINISTRATIVE) {
            receiver = accountRepository.findByRole(Role.ACCOUNTANT)
                    .stream()
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("Accountant not found"));
        } else {
            if (request.getReceiverId() != null) {
                receiver = accountRepository.findById(request.getReceiverId())
                        .orElseThrow(() -> new IllegalArgumentException("Receiver not found"));
            }
        }

        Document doc = Document.builder()
                .title(request.getTitle())
                .content(request.getContent())
                .fileUrl(null)
                .createdBy(creator)
                .receiver(receiver)
                .createdAt(LocalDateTime.now())
                .status(DocumentStatus.NEW)
                .type(request.getType())
                .build();

        Document saved = documentRepository.save(doc);

        // Prepare placeholders for Word template
        Map<String, String> placeholders = new HashMap<>();
        placeholders.put("soVanBan", saved.getId().toString());
        placeholders.put("tenDonVi", creator.getUsername());
        placeholders.put("nguoiNhan", receiver != null ? receiver.getUsername() : "");
        placeholders.put("noiDung", saved.getContent());

        LocalDateTime ngayTao = saved.getCreatedAt();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd 'tháng' MM 'năm' yyyy");
        String ngayTaoFormatted = ngayTao.format(formatter);
        placeholders.put("ngayTao", ngayTaoFormatted);

        byte[] wordFile = exportDocumentToWord(placeholders);

        String logicalFileName = "congvan_" + saved.getId() + ".docx";
        String fileUrl = uploadFileService.storeFileFromBytes("documents", logicalFileName, wordFile);
        saved.setFileUrl(fileUrl);
        documentRepository.save(saved);

        // Notify receiver
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

    public List<DocumentResponseDto> getDocumentsByReceiver(String receiverUsername) {
        Account receiver = accountRepository.findByUsername(receiverUsername)
                .orElseThrow(() -> new IllegalArgumentException("Receiver not found"));
        return documentRepository.findByReceiver(receiver)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public DocumentResponseDto getDocumentById(Long id) {
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Document not found"));
        return mapToResponse(doc);
    }

    public Document getDocumentEntityById(Long id) {
        return documentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Document not found"));
    }

    private DocumentResponseDto mapToResponse(Document doc) {
        DocumentResponseDto dto = new DocumentResponseDto();
        dto.setId(doc.getId());
        dto.setTitle(doc.getTitle());
        dto.setContent(doc.getContent());
        dto.setFileUrl(doc.getFileUrl());
        dto.setCreatedBy(doc.getCreatedBy().getUsername());
        dto.setReceiver(doc.getReceiver() != null ? doc.getReceiver().getUsername() : null);
        dto.setType(doc.getType());
        dto.setStatus(doc.getStatus());
        dto.setCreatedAt(doc.getCreatedAt());
        return dto;
    }

    private void replacePlaceholdersInParagraph(XWPFParagraph paragraph, Map<String, String> data) {
        for (XWPFRun run : paragraph.getRuns()) {
            String runText = run.getText(0);
            if (runText != null) {
                for (String key : data.keySet()) {
                    String placeholder = "{{" + key + "}}";
                    if (runText.contains(placeholder)) {
                        runText = runText.replace(placeholder, data.get(key));
                    }
                }
                run.setText(runText, 0);
            }
        }
    }

    public byte[] exportDocumentToWord(Map<String, String> data) throws IOException {
        try (InputStream template = new ClassPathResource("templates/template.docx").getInputStream();
             XWPFDocument document = new XWPFDocument(template)) {

            // Replace in all paragraphs (outside tables)
            for (XWPFParagraph p : document.getParagraphs()) {
                replacePlaceholdersInParagraph(p, data);
            }

            // Replace in all paragraphs (inside tables)
            for (XWPFTable tbl : document.getTables()) {
                for (XWPFTableRow row : tbl.getRows()) {
                    for (XWPFTableCell cell : row.getTableCells()) {
                        for (XWPFParagraph p : cell.getParagraphs()) {
                            replacePlaceholdersInParagraph(p, data);
                        }
                    }
                }
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            document.write(baos);
            return baos.toByteArray();
        }
    }
}
