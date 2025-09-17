package server.controllers;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.apache.poi.openxml4j.exceptions.InvalidFormatException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import server.dtos.leave_requests.LeaveRequestCreateRequest;
import server.dtos.leave_requests.LeaveRequestResponse;
import server.models.Account;
import server.models.LeaveRequest;
import server.models.SignatureSample;
import server.repositories.LeaveRequestRepository;
import server.repositories.SignatureSampleRepository;
import server.services.AuthService;
import server.services.LeaveRequestService;
import server.utils.ApiResponse;
import server.dtos.leave_requests.LeaveRequestApproveRequest;
import server.dtos.leave_requests.LeaveCancelRequest;


import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/leave-requests")
@RequiredArgsConstructor
public class LeaveRequestController {

    private final LeaveRequestService leaveRequestService;
    private final AuthService authService;
    private final LeaveRequestRepository leaveRequestRepository;
    private final SignatureSampleRepository signatureSampleRepository;

    // Tạo đơn nghỉ phép
    @PostMapping
    public ApiResponse<LeaveRequestResponse> createLeaveRequest(
            HttpServletRequest request,
            @RequestBody LeaveRequestCreateRequest dto
    ) {
        return leaveRequestService.create(request, dto);
    }

    // Lấy danh sách đơn nghỉ phép (có filter + phân trang)
    @GetMapping
    public ApiResponse<?> getAllLeaveRequests(
            HttpServletRequest request,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) String departmentName,
            @RequestParam(required = false) String senderName,   // <-- mới (keyword)
            @RequestParam(required = false) String date,         // <-- mới (yyyy-MM-dd)
            @RequestParam(required = false) String month         // <-- mới (yyyy-MM)
    ) {
        return leaveRequestService.listAll(
                request, status, page, size, departmentId, departmentName, senderName, date, month
        );
    }

    // Duyệt đơn nghỉ phép
    @PostMapping("/{id}/approve")
    public ApiResponse<LeaveRequestResponse> approveLeaveRequest(
            HttpServletRequest request,
            @PathVariable Long id,
            @RequestBody LeaveRequestApproveRequest dto // nhận chữ ký FE gửi lên
    ) {
        return leaveRequestService.approveOrReject(request, id, true, dto);
    }

    // Từ chối đơn nghỉ phép (người duyệt)
    @PostMapping("/{id}/reject")
    public ApiResponse<LeaveRequestResponse> rejectLeaveRequest(
            HttpServletRequest request,
            @PathVariable Long id,
            @RequestBody(required = false) LeaveRequestApproveRequest dto // nhận body từ FE
    ) {
        return leaveRequestService.approveOrReject(request, id, false, dto);
    }

    // EXPORT WORD: Xuất đơn nghỉ phép ra file Word
    @GetMapping("/{id}/export-word")
    public void exportLeaveRequestToWord(
            @PathVariable Long id,
            HttpServletResponse response
    ) throws IOException, InvalidFormatException {
        Optional<LeaveRequest> leaveOpt = leaveRequestRepository.findById(id);
        if (leaveOpt.isEmpty()) {
            response.setStatus(HttpServletResponse.SC_NOT_FOUND);
            response.getWriter().write("Leave request not found");
            return;
        }
        LeaveRequest leave = leaveOpt.get();

        // --- TÌM CÁC ĐƠN NGẮT QUÃNG NẾU CÓ ---
        List<LeaveRequest> splitLeaves = null;
        if (leave.getBatchId() != null) {
            splitLeaves = leaveRequestRepository.findByBatchIdOrderByStartDateAsc(leave.getBatchId());
        }

        // Nếu không phải nghỉ ngắt quãng, truyền null hoặc Collections.emptyList()
        Map<String, String> data = leaveRequestService.prepareLeaveRequestDataForWord(leave, splitLeaves);
        String signature = leave.getSignature(); // nếu chưa có thì truyền ""
        byte[] docxBytes = leaveRequestService.exportDocumentToWord(data, signature);

        response.setContentType(MediaType.APPLICATION_OCTET_STREAM_VALUE);
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=leaveRequest.docx");
        response.getOutputStream().write(docxBytes);
        response.getOutputStream().flush();
    }

    @GetMapping("/pending-to-approve")
    public ApiResponse<?> getPendingToApprove(HttpServletRequest request) {
        return leaveRequestService.listMyPendingToApprove(request);
    }

    @GetMapping("/my-pending")
    public ApiResponse<?> getMyPendingSent(HttpServletRequest request) {
        return leaveRequestService.listMyPendingSent(request);
    }

    @GetMapping("/{id}")
    public ApiResponse<?> getLeaveRequestDetail(@PathVariable Long id, HttpServletRequest request) {
        return leaveRequestService.getDetail(id, request);
    }

    @GetMapping("/busy-days")
    public ApiResponse<?> getBusyLeaveDays(
            @RequestParam Long departmentId,
            @RequestParam String month // format: "2024-07"
    ) {
        return leaveRequestService.getBusyDays(departmentId, month);
    }

    @GetMapping("/leave-balance")
    public ApiResponse<?> getLeaveBalance(
            HttpServletRequest request,
            @RequestParam String month // format: yyyy-MM
    ) {
        return leaveRequestService.getLeaveBalance(request, month);
    }

    @GetMapping("/my-signature-sample")
    public ApiResponse<String> getMySignatureSample(HttpServletRequest request) {
        Account current = authService.getCurrentAccount(request);
        Optional<SignatureSample> sampleOpt = signatureSampleRepository.findByAccount(current);
        return sampleOpt
                .map(sample -> ApiResponse.success(sample.getSignatureBase64(), "Lấy chữ ký mẫu thành công"))
                .orElseGet(() -> ApiResponse.success(null, "Bạn chưa có chữ ký mẫu"));
    }

    @PostMapping("/my-signature-sample")
    public ApiResponse<?> saveOrUpdateSignatureSample(
            HttpServletRequest request,
            @RequestBody String signatureBase64
    ) {
        Account current = authService.getCurrentAccount(request);
        Optional<SignatureSample> sampleOpt = signatureSampleRepository.findByAccount(current);
        SignatureSample sample = sampleOpt.orElseGet(SignatureSample::new);
        sample.setAccount(current);
        sample.setSignatureBase64(signatureBase64);
        signatureSampleRepository.save(sample);
        return ApiResponse.success(null, "Lưu chữ ký mẫu thành công");
    }

    // HR xác nhận (APPROVE) khi đơn đang PENDING_HR
    @PostMapping("/{id}/hr-confirm")
    public ApiResponse<LeaveRequestResponse> hrConfirm(
            HttpServletRequest request,
            @PathVariable Long id
    ) {
        return leaveRequestService.hrConfirm(request, id);
    }

    // HR từ chối xác nhận khi đơn đang PENDING_HR
    @PostMapping("/{id}/hr-reject")
    public ApiResponse<LeaveRequestResponse> hrReject(
            HttpServletRequest request,
            @PathVariable Long id,
            @RequestBody(required = false) LeaveRequestApproveRequest dto
    ) {
        return leaveRequestService.hrReject(request, id, dto);
    }

    // Danh sách đơn đang chờ HR xác nhận
    @GetMapping("/pending-hr")
    public ApiResponse<?> listAwaitingHr(HttpServletRequest request) {
        return leaveRequestService.listAwaitingHr(request);
    }

    // Nhân viên gửi yêu cầu HỦY đơn nghỉ phép (gửi mail cho Người duyệt + HR)
    @PostMapping("/{id}/cancel-request")
    public ApiResponse<?> requestCancelLeave(
            HttpServletRequest request,
            @PathVariable Long id,
            @RequestBody LeaveCancelRequest dto
    ) {
        return leaveRequestService.requestCancellation(request, id, dto);
    }


    // HR hủy đơn (chỉ HR có quyền, logic kiểm tra ở service)
    @PostMapping("/{id}/hr-cancel")
    public ApiResponse<LeaveRequestResponse> hrCancelLeave(
            HttpServletRequest request,
            @PathVariable Long id
    ) {
        return leaveRequestService.hrCancel(request, id);
    }

    @GetMapping("/my-expired-count")
    public ApiResponse<Long> myExpiredCount(HttpServletRequest request,
                                            @RequestParam(required = false) String month) {
        return leaveRequestService.getMyExpiredCountThisMonth(request, month);
    }

}
