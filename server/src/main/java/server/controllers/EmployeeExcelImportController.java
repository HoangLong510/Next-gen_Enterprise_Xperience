package server.controllers;

import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import server.dtos.ImportEmployeesResult;
import server.services.EmployeeExcelImportService;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/employees/import")
@RequiredArgsConstructor
public class EmployeeExcelImportController {
    private final EmployeeExcelImportService service;

    @PostMapping(value = "/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ImportEmployeesResult> preview(@RequestPart("file") MultipartFile file) throws Exception {
        ImportEmployeesResult result = service.preview(file);
        return ResponseEntity.ok(result);
    }

    @PostMapping(value = "/", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ImportEmployeesResult> importAndSave(@RequestPart("file") MultipartFile file) throws Exception {
        ImportEmployeesResult result = service.importAndSave(file);
        return ResponseEntity.ok(result);
    }

    @GetMapping(value = "/template")
    public ResponseEntity<byte[]> downloadTemplate() throws Exception {
        byte[] data = service.buildTemplate();
        String filename = URLEncoder.encode("employee_import_template.xlsx", StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename*=UTF-8''" + filename)
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(data);
    }
}
