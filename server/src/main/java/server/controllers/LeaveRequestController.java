package server.controllers;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.apache.poi.openxml4j.exceptions.InvalidFormatException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import server.dtos.leave_requests.LeaveRequestCreateRequest;
import server.dtos.leave_requests.LeaveRequestResponse;
import server.models.LeaveRequest;
import server.repositories.LeaveRequestRepository;
import server.services.LeaveRequestService;
import server.utils.ApiResponse;
import server.dtos.leave_requests.LeaveRequestApproveRequest;


import java.io.IOException;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/leave-requests")
@RequiredArgsConstructor
public class LeaveRequestController {

    private final LeaveRequestService leaveRequestService;
    private final LeaveRequestRepository leaveRequestRepository;

    // Tạo đơn nghỉ phép
    @PostMapping
    public ApiResponse<LeaveRequestResponse> createLeaveRequest(
            HttpServletRequest request,
            @RequestBody LeaveRequestCreateRequest dto
    ) {
        return leaveRequestService.create(request, dto);
    }

    // Lấy danh sách đơn nghỉ phép
    @GetMapping
    public ApiResponse<?> getAllLeaveRequests(
            HttpServletRequest request,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size
    ) {
        return leaveRequestService.listAll(request, status, page, size);
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


    // Từ chối đơn nghỉ phép
    @PostMapping("/{id}/reject")
    public ApiResponse<LeaveRequestResponse> rejectLeaveRequest(
            HttpServletRequest request,
            @PathVariable Long id
    ) {
        return leaveRequestService.approveOrReject(request, id, false, null);
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
        Map<String, String> data = leaveRequestService.prepareLeaveRequestDataForWord(leave);
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

}
