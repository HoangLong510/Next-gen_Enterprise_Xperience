package server.controllers;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import server.dtos.Contracts.ContractRequest;
import server.dtos.Contracts.ContractResponse;
import server.dtos.Contracts.SignContractRequest;
import server.services.ContractService;
import server.utils.ApiResponse;
import org.apache.poi.openxml4j.exceptions.InvalidFormatException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/contracts")
@RequiredArgsConstructor
public class ContractController {

    private final ContractService contractService;

    @GetMapping
    public ApiResponse<List<ContractResponse>> getAll() {
        return contractService.getAll();
    }

    @GetMapping("/{id}")
    public ApiResponse<ContractResponse> getById(@PathVariable Long id) {
        return contractService.getById(id);
    }

    @PostMapping
    public ApiResponse<ContractResponse> create(@Valid @RequestBody ContractRequest req,
                                                BindingResult bindingResult) {
        if (bindingResult.hasErrors()) return ApiResponse.badRequest(bindingResult);
        return contractService.create(req);
    }

    @PutMapping("/{id}")
    public ApiResponse<ContractResponse> update(@PathVariable Long id,
                                                @Valid @RequestBody ContractRequest req,
                                                BindingResult bindingResult) {
        if (bindingResult.hasErrors()) return ApiResponse.badRequest(bindingResult);
        return contractService.update(id, req);
    }

    @DeleteMapping("/{id}")
    public ApiResponse<?> delete(@PathVariable Long id) {
        return contractService.delete(id);
    }

    // ===== Ký hợp đồng (MANAGER hoặc EMPLOYEE) =====
    // FE gọi: POST /contracts/sign/{contractId}?signerRole=MANAGER|EMPLOYEE
    // Body (optional): { "signature": "data:image/png;base64,...." }
    @PostMapping("/sign/{contractId}")
    public ApiResponse<ContractResponse> signContract(HttpServletRequest request,
                                                      @PathVariable Long contractId,
                                                      @RequestParam String signerRole,
                                                      @RequestBody(required = false) SignContractRequest body) {
        String signature = (body != null) ? body.getSignature() : null; // null -> dùng SignatureSample đã lưu
        return contractService.signContract(request, contractId, signerRole, signature);
    }

    // ===== Tùy chọn: endpoint test expire ngay hôm nay =====
    @PostMapping("/expire-today")
    public ApiResponse<Integer> expireToday() {
        int affected = contractService.expireOverdueToday();
        return ApiResponse.success(affected, "Expired " + affected + " contract(s) that passed endDate today");
    }

    @GetMapping("/{id}/export-word")
    public ResponseEntity<byte[]> exportContractToWord(@PathVariable Long id) {
        try {
            byte[] bytes = contractService.exportContractToWord(id);

            // Lấy contract code để đặt tên file đẹp
            ApiResponse<ContractResponse> detail = contractService.getById(id);
            String code = (detail.getData() != null && detail.getData().getContractCode() != null)
                    ? detail.getData().getContractCode()
                    : String.valueOf(id);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"hop-dong-" + code + ".docx\"")
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .body(bytes);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).build();
        } catch (InvalidFormatException | IOException e) {
            return ResponseEntity.status(500).build();
        }
    }
}
