package server.services;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.apache.poi.openxml4j.exceptions.InvalidFormatException;
import org.apache.poi.xwpf.usermodel.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import server.dtos.DocumentRequestDto;
import server.dtos.DocumentResponseDto;
import server.dtos.GetDocumentsPageDto;
import server.models.*;
import server.models.Document;
import server.models.enums.DocumentStatus;
import server.models.enums.DocumentType;
import server.models.enums.NotificationType;
import server.models.enums.Role;
import server.repositories.*;
import server.specification.DocumentSpecifications;
import org.springframework.data.domain.*;
import server.utils.ApiResponse;

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
                .signature(request.getSignature())
                .build();

        Document saved = documentRepository.save(doc);

        // Prepare placeholders for Word template
        Map<String, String> placeholders = new HashMap<>();
        placeholders.put("soVanBan", saved.getId().toString());
        placeholders.put("tenDonVi", creator.getUsername());
        placeholders.put("nguoiNhan", receiver != null ? receiver.getUsername() : "");
        placeholders.put("noiDung", saved.getContent());
        placeholders.put("kyTen", saved.getSignature());
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
        notificationService.createNotification(NotificationType.DOCUMENT, saved.getId(), false);

        DocumentResponseDto responseDto = mapToResponse(saved);
        responseDto.setFile(wordFile);
        return responseDto;
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
        dto.setSignature(doc.getSignature());
        return dto;
    }


    private ApiResponse<?> getDocumentsPageInternal(GetDocumentsPageDto req, Specification<Document> extraSpec) {
        int pageSize = req.getPageSize() > 0 ? req.getPageSize() : 10;
        int pageNumber = Math.max(1, req.getPageNumber()) - 1;

        Sort.Direction direction = "desc".equalsIgnoreCase(req.getSortBy()) ? Sort.Direction.DESC : Sort.Direction.ASC;
        Pageable pageable = PageRequest.of(pageNumber, pageSize, direction, "createdAt");

        DocumentStatus statusFilter = null;
        if (req.getStatusFilter() != null && !req.getStatusFilter().isEmpty()) {
            try { statusFilter = DocumentStatus.valueOf(req.getStatusFilter()); } catch (Exception ignored) {}
        }
        DocumentType typeFilter = null;
        if (req.getTypeFilter() != null && !req.getTypeFilter().isEmpty()) {
            try { typeFilter = DocumentType.valueOf(req.getTypeFilter()); } catch (Exception ignored) {}
        }

        Specification<Document> spec = DocumentSpecifications.status(statusFilter)
                .and(DocumentSpecifications.type(typeFilter))
                .and(DocumentSpecifications.searchTerm(req.getSearchTerm()));

        if (extraSpec != null) {
            spec = spec.and(extraSpec);
        }

        Page<Document> page = documentRepository.findAll(spec, pageable);

        List<DocumentResponseDto> listDto = page.getContent().stream().map(this::mapToResponse).toList();

        Map<String, Object> responseData = new HashMap<>();
        responseData.put("totalPage", page.getTotalPages());
        responseData.put("totalElements", page.getTotalElements());
        responseData.put("currentPage", page.getNumber() + 1);
        responseData.put("documents", listDto);

        return ApiResponse.success(responseData, "Fetched documents with filter & paging");
    }

    public ApiResponse<?> getDocumentsPage(GetDocumentsPageDto req) {
        return getDocumentsPageInternal(req, null);
    }

    public ApiResponse<?> getMyDocumentsPage(GetDocumentsPageDto req, String username) {
        Account receiver = accountRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Receiver not found"));
        Specification<Document> filterByReceiver = (root, query, cb) -> cb.equal(root.get("receiver"), receiver);
        return getDocumentsPageInternal(req, filterByReceiver);
    }


    private void replacePlaceholdersInParagraph(XWPFParagraph paragraph, Map<String, String> data) throws IOException, InvalidFormatException {
        for (XWPFRun run : paragraph.getRuns()) {
            String runText = run.getText(0);
            if (runText != null) {
                boolean isSignatureInserted = false;
                for (String key : data.keySet()) {
                    String placeholder = "{{" + key + "}}";
                    if (runText.contains(placeholder)) {
                        if ("kyTen".equals(key) && data.get(key) != null && !data.get(key).isEmpty()) {
                            // Chèn ảnh chữ ký, chỉ làm 1 lần cho đoạn đó
                            run.setText("", 0);
                            String imgBase64 = data.get(key);
                            if (imgBase64.contains(",")) {
                                imgBase64 = imgBase64.substring(imgBase64.indexOf(",") + 1);
                            }
                            byte[] imgBytes = java.util.Base64.getDecoder().decode(imgBase64);
                            run.addPicture(
                                    new java.io.ByteArrayInputStream(imgBytes),
                                    XWPFDocument.PICTURE_TYPE_PNG,
                                    "signature.png",
                                    org.apache.poi.util.Units.toEMU(100),
                                    org.apache.poi.util.Units.toEMU(40)
                            );
                            isSignatureInserted = true;
                            break; // Không cần xử lý tiếp key khác
                        } else {
                            // Bình thường: thay bằng text
                            runText = runText.replace(placeholder, data.get(key));
                        }
                    }
                }
                // Chỉ set text lại nếu không phải ký tên (vì ký tên đã setText "" ở trên)
                if (!isSignatureInserted) {
                    run.setText(runText, 0);
                }
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
        } catch (InvalidFormatException e) {
            throw new RuntimeException(e);
        }
    }
}
