package server.services;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.apache.poi.openxml4j.exceptions.InvalidFormatException;
import org.apache.poi.xwpf.usermodel.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.zwobble.mammoth.DocumentConverter;
import org.zwobble.mammoth.Result;
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

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Paths;
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
                .signature(null) // Không có signature lúc tạo
                .build();
        Document saved = documentRepository.save(doc);

        String code = String.format("CV-%s-%04d",
                LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd")),
                saved.getId());
        saved.setCode(code);
        documentRepository.save(saved);

        // Prepare placeholders for Word template
        Map<String, String> placeholders = new HashMap<>();
        placeholders.put("soVanBan", saved.getCode());  // <-- Dùng code thay vì id!
        placeholders.put("tenDonVi", creator.getUsername());
        placeholders.put("nguoiNhan", receiver != null ? receiver.getUsername() : "");
        placeholders.put("noiDung", saved.getContent());
        placeholders.put("kyTen", ""); // Chưa ký
        LocalDateTime ngayTao = saved.getCreatedAt();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd 'tháng' MM 'năm' yyyy");
        placeholders.put("ngayTao", ngayTao.format(formatter));

        byte[] wordFile = exportDocumentToWord(placeholders);

        String logicalFileName = "congvan_" + saved.getId() + ".docx";
        String fileUrl = uploadFileService.storeFileFromBytes("documents", logicalFileName, wordFile);
        saved.setFileUrl(fileUrl);
        documentRepository.save(saved);

        String previewHtml = convertDocxToHtml(saved.getFileUrl());
        // bạn tự hiện thực hàm này
        notificationService.createNotification(NotificationType.DOCUMENT, saved.getId(), false);


        DocumentResponseDto responseDto = mapToResponse(saved);
        responseDto.setFile(null); // Không trả file luôn
        responseDto.setPreviewHtml(previewHtml);
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
        dto.setCode(doc.getCode());
        dto.setTitle(doc.getTitle());
        dto.setContent(doc.getContent());
        dto.setFileUrl(doc.getFileUrl());
        dto.setCreatedBy(doc.getCreatedBy().getUsername());
        dto.setReceiver(doc.getReceiver() != null ? doc.getReceiver().getUsername() : null);
        dto.setType(doc.getType());
        dto.setStatus(doc.getStatus());
        dto.setCreatedAt(doc.getCreatedAt());
        dto.setSignature(doc.getSignature());

        if (doc.getFileUrl() != null) {
            try {
                dto.setPreviewHtml(convertDocxToHtml(doc.getFileUrl()));
            } catch (Exception ex) {
                dto.setPreviewHtml(null);
            }
        } else {
            dto.setPreviewHtml(null);
        }

        return dto;
    }


    private ApiResponse<?> getDocumentsPageInternal(GetDocumentsPageDto req, Specification<Document> extraSpec) {
        int pageSize = req.getPageSize() > 0 ? req.getPageSize() : 10;
        int pageNumber = Math.max(1, req.getPageNumber()) - 1;

        Sort.Direction direction = "desc".equalsIgnoreCase(req.getSortBy()) ? Sort.Direction.DESC : Sort.Direction.ASC;
        Pageable pageable = PageRequest.of(pageNumber, pageSize, direction, "createdAt");

        DocumentStatus statusFilter = null;
        if (req.getStatusFilter() != null && !req.getStatusFilter().isEmpty()) {
            try {
                statusFilter = DocumentStatus.valueOf(req.getStatusFilter());
            } catch (Exception ignored) {
            }
        }
        DocumentType typeFilter = null;
        if (req.getTypeFilter() != null && !req.getTypeFilter().isEmpty()) {
            try {
                typeFilter = DocumentType.valueOf(req.getTypeFilter());
            } catch (Exception ignored) {
            }
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

    public DocumentResponseDto signDocument(Long id, String signature) throws IOException {
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Document not found"));

        if (doc.getStatus() != DocumentStatus.NEW) {
            throw new IllegalStateException("Chỉ ký khi trạng thái NEW");
        }

        doc.setSignature(signature);
        doc.setStatus(DocumentStatus.SIGNED);

        // Prepare placeholders lại, lần này có signature
        Map<String, String> placeholders = new HashMap<>();
        placeholders.put("soVanBan", doc.getId().toString());
        placeholders.put("tenDonVi", doc.getCreatedBy().getUsername());
        placeholders.put("nguoiNhan", doc.getReceiver() != null ? doc.getReceiver().getUsername() : "");
        placeholders.put("noiDung", doc.getContent());
        placeholders.put("kyTen", signature); // Đã ký
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd 'tháng' MM 'năm' yyyy");
        placeholders.put("ngayTao", doc.getCreatedAt().format(formatter));

        byte[] wordFile = exportDocumentToWord(placeholders);

        String logicalFileName = "congvan_" + doc.getId() + ".docx";
        String fileUrl = uploadFileService.storeFileFromBytes("documents", logicalFileName, wordFile);
        doc.setFileUrl(fileUrl);

        Document saved = documentRepository.save(doc);

        // Chuyển file docx thành HTML preview
        String previewHtml = convertDocxToHtml(saved.getFileUrl());

        // Notify receiver (người nhận công văn) khi đã ký
        notificationService.createNotification(NotificationType.DOCUMENT, saved.getId(), true);

        DocumentResponseDto dto = mapToResponse(saved);
        dto.setFile(null); // chỉ trả khi FE cần tải về
        dto.setPreviewHtml(previewHtml);
        return dto;
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


    public String convertDocxToHtml(String fileUrl) throws IOException {
        // fileUrl là đường dẫn tới file Word đã lưu, ví dụ "/uploads/documents/abc.docx"
        // Xử lý đường dẫn thực tế trên ổ đĩa (nối với uploadFolder nếu cần)
        String localPath = fileUrl;
        if (fileUrl.startsWith("/uploads/")) {
            localPath = uploadFolder + fileUrl.replace("/uploads", "");
        }

        byte[] docxBytes = Files.readAllBytes(Paths.get(localPath));
        try (InputStream is = new ByteArrayInputStream(docxBytes)) {
            DocumentConverter converter = new DocumentConverter();
            Result<String> result = converter.convertToHtml(is);
            return result.getValue();
        }
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
