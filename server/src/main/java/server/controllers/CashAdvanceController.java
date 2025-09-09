package server.controllers;

import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import server.dtos.CreateCashAdvanceDto;
import server.models.Account;
import server.services.CashAdvanceService;
import server.utils.ApiResponse;

import java.io.IOException;

@RestController
@RequestMapping("/cash-advances")
@RequiredArgsConstructor
public class CashAdvanceController {

    private final CashAdvanceService cashAdvanceService;

    // Payload đơn giản cho các quyết định approve/reject ở từng cấp
    public static class DecisionPayload {
        public Boolean approve; // true = approve, false = reject
        public String note;     // optional, dùng khi reject
    }

    /* ================== Create ================== */

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<?> create(Authentication auth,
                                 @RequestPart("payload") CreateCashAdvanceDto payload,
                                 @RequestPart(value = "file", required = false) MultipartFile file) {
        Account me = (Account) auth.getPrincipal();
        return cashAdvanceService.create(me, payload, file);
    }

    @PostMapping(path = "/simple", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<?> createSimple(Authentication auth,
                                       @RequestParam Long taskId,
                                       @RequestParam Double amount,
                                       @RequestParam(required = false) String reason,
                                       @RequestPart(value = "file", required = false) MultipartFile file) {
        Account me = (Account) auth.getPrincipal();
        CreateCashAdvanceDto dto = new CreateCashAdvanceDto();
        dto.setTaskId(taskId);
        dto.setAmount(amount);
        dto.setReason(reason);
        return cashAdvanceService.create(me, dto, file);
    }


    @GetMapping("/my")
    public ApiResponse<?> my(Authentication auth) {
        Account me = (Account) auth.getPrincipal();
        return cashAdvanceService.myRequests(me);
    }

    @GetMapping
    public ApiResponse<?> list(Authentication auth,
                               @RequestParam(required = false) String status,
                               @RequestParam(required = false) String scope) {
        Account me = (Account) auth.getPrincipal();
        return cashAdvanceService.list(me, status, scope);
    }

    // Inbox theo cấp duyệt
    @GetMapping("/pending/accountant")
    public ApiResponse<?> pendingForAccountant() {
        return cashAdvanceService.pendingForAccountant();
    }

    @GetMapping("/pending/chief")
    public ApiResponse<?> pendingForChief() {
        return cashAdvanceService.pendingForChief();
    }

    @GetMapping("/pending/director")
    public ApiResponse<?> pendingForDirector() {
        return cashAdvanceService.pendingForDirector();
    }

    /* ================== Decisions per role ================== */

    // Kế toán: duyệt/từ chối từ trạng thái PENDING
    @PostMapping("/{id}/accountant-decision")
    public ApiResponse<?> accountantDecision(Authentication auth,
                                             @PathVariable Long id,
                                             @RequestBody DecisionPayload payload) {
        Account me = (Account) auth.getPrincipal();
        boolean approve = payload != null && Boolean.TRUE.equals(payload.approve);
        String note = payload != null ? payload.note : null;
        return cashAdvanceService.accountantApprove(me, id, approve, note);
    }

    // Kế toán trưởng: duyệt/từ chối từ trạng thái APPROVED_ACCOUNTANT
    @PostMapping("/{id}/chief-decision")
    public ApiResponse<?> chiefDecision(Authentication auth,
                                        @PathVariable Long id,
                                        @RequestBody DecisionPayload payload) {
        Account me = (Account) auth.getPrincipal();
        boolean approve = payload != null && Boolean.TRUE.equals(payload.approve);
        String note = payload != null ? payload.note : null;
        return cashAdvanceService.chiefApprove(me, id, approve, note);
    }

    // Giám đốc: duyệt/từ chối từ trạng thái APPROVED_CHIEF
    @PostMapping("/{id}/director-decision")
    public ApiResponse<?> directorDecision(Authentication auth,
                                           @PathVariable Long id,
                                           @RequestBody DecisionPayload payload) {
        Account me = (Account) auth.getPrincipal();
        boolean approve = payload != null && Boolean.TRUE.equals(payload.approve);
        String note = payload != null ? payload.note : null;
        return cashAdvanceService.directorApprove(me, id, approve, note);
    }

    /* ================== Deprecated (nếu FE cũ còn gọi) ==================
       Nếu không cần tương thích ngược thì có thể xoá hẳn 4 endpoint này.
    */

    @Deprecated
    @GetMapping("/pending") // trước đây: inbox kế toán viên
    public ApiResponse<?> pendingDeprecated() {
        return cashAdvanceService.pendingForAccountant();
    }

    @Deprecated
    @PostMapping("/{id}/status") // trước đây: updateStatus (kế toán)
    public ApiResponse<?> updateStatusDeprecated() {
        return ApiResponse.badRequest("deprecated-use /{id}/accountant-decision");
    }

    @Deprecated
    @PostMapping("/send-to-chief")
    public ApiResponse<?> sendToChiefDeprecated() {
        return ApiResponse.badRequest("deprecated-no-send-step-use /pending/chief & /{id}/chief-decision");
    }

    @Deprecated
    @PostMapping("/send-to-director")
    public ApiResponse<?> sendToDirectorDeprecated() {
        return ApiResponse.badRequest("deprecated-no-send-step-use /pending/director & /{id}/director-decision");
    }
}
