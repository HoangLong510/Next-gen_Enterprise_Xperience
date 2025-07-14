package server.services;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.apache.poi.openxml4j.exceptions.InvalidFormatException;
import org.apache.poi.xwpf.usermodel.*;
import org.springframework.stereotype.Service;
import server.dtos.leave_requests.*;
import server.models.Account;
import server.models.Employee;
import server.models.LeaveRequest;
import server.models.enums.Role;
import server.repositories.AccountRepository;
import server.repositories.LeaveRequestRepository;
import org.apache.poi.util.Units;

import java.io.ByteArrayInputStream;
import java.util.*;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;

import server.utils.ApiResponse;
import server.models.enums.LeaveStatus;

import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LeaveRequestService {
    private final LeaveRequestRepository leaveRequestRepository;
    private final AccountRepository accountRepository;
    private final AuthService authService;

    // Tạo đơn nghỉ phép
    public ApiResponse<LeaveRequestResponse> create(HttpServletRequest request, LeaveRequestCreateRequest dto) {
        Account sender = authService.getCurrentAccount(request);
        Role role = sender.getRole();

        // Validate ngày
        if (dto.getStartDate() == null || dto.getEndDate() == null || dto.getStartDate().isAfter(dto.getEndDate())) {
            return ApiResponse.badRequest("Ngày nghỉ không được bỏ trống và ngày kết thúc không được sau ngày bắt đầu");
        }
        if (dto.getReason() == null || dto.getReason().trim().isEmpty()) {
            return ApiResponse.badRequest("Lý do không được để trống");
        }

        // Validate người nhận
        Optional<Account> receiverOpt = accountRepository.findById(dto.getReceiverId());
        if (receiverOpt.isEmpty()) {
            return ApiResponse.notfound("Người nhận không tồn tại");
        }
        Account receiver = receiverOpt.get();

        // Phân quyền gửi đơn
        if (role == Role.EMPLOYEE) {
            if (receiver.getRole() != Role.HOD) {
                return ApiResponse.badRequest("Nhân viên chỉ được gửi đơn cho trưởng phòng (HOD)");
            }
        } else if (role == Role.HOD) {
            if (receiver.getRole() != Role.MANAGER) {
                return ApiResponse.badRequest("Trưởng phòng chỉ được gửi đơn cho giám đốc (MANAGER)");
            }
        } else if (role == Role.PM) {
            if (receiver.getRole() != Role.MANAGER) {
                return ApiResponse.badRequest("PM chỉ được gửi đơn cho giám đốc (MANAGER)");
            }
        } else {
            return ApiResponse.unauthorized();
        }

        // Tạo đơn
        LeaveRequest entity = new LeaveRequest();
        entity.setReason(dto.getReason());
        entity.setStartDate(dto.getStartDate());
        entity.setEndDate(dto.getEndDate());
        entity.setStatus(LeaveStatus.PENDING);
        entity.setSender(sender);
        entity.setReceiver(receiver);

        leaveRequestRepository.save(entity);

        LeaveRequestResponse response = toResponse(entity);
        return ApiResponse.created(response, "Tạo đơn nghỉ phép thành công");
    }

    // Trả về DANH SÁCH đơn cần được bạn duyệt
    public ApiResponse<?> listMyPendingToApprove(HttpServletRequest request) {
        Account user = authService.getCurrentAccount(request);
        Role role = user.getRole();

        if (role != Role.HOD && role != Role.MANAGER) {
            return ApiResponse.success(Collections.emptyList(), "Bạn không có quyền duyệt đơn!");
        }

        List<LeaveRequest> pendingRequests = leaveRequestRepository
                .findByStatus(LeaveStatus.PENDING)
                .stream()
                .filter(lr -> lr.getReceiver().getId().equals(user.getId()))
                .collect(Collectors.toList());

        List<LeaveRequestResponse> data = pendingRequests.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());

        return ApiResponse.success(data, "Các đơn cần bạn duyệt");
    }



    //trả về danh sách đơn của bạn mà chưa được duyệt
    public ApiResponse<?> listMyPendingSent(HttpServletRequest request) {
        Account user = authService.getCurrentAccount(request);
        // Lấy đơn sender là mình và status là PENDING
        List<LeaveRequest> myPending = leaveRequestRepository
                .findByStatus(LeaveStatus.PENDING)
                .stream()
                .filter(lr -> lr.getSender().getId().equals(user.getId()))
                .collect(Collectors.toList());

        List<LeaveRequestResponse> data = myPending.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());

        return ApiResponse.success(data, "Các đơn bạn đã gửi và chưa được duyệt");
    }


    // Danh sách đơn nghỉ phép: filter status và phân trang
    public ApiResponse<?> listAll(HttpServletRequest request, String status, Integer page, Integer size) {
        Account user = authService.getCurrentAccount(request);
        Role role = user.getRole();

        int pageIndex = (page != null && page > 0) ? page - 1 : 0;
        int pageSize = (size != null && size > 0) ? size : 10;

        List<LeaveRequest> allLeaves;

        // Lấy toàn bộ (không phân trang ở DB)
        if (status != null && !status.isEmpty()) {
            LeaveStatus leaveStatus;
            try {
                leaveStatus = LeaveStatus.valueOf(status);
            } catch (IllegalArgumentException e) {
                return ApiResponse.badRequest("Trạng thái đơn không hợp lệ!");
            }
            allLeaves = leaveRequestRepository.findByStatus(leaveStatus);
        } else {
            allLeaves = leaveRequestRepository.findAll();
        }

        // Lọc quyền ở BE (trước khi phân trang)
        List<LeaveRequest> filtered = allLeaves.stream()
                .filter(lr -> {
                    switch (role) {
                        case ADMIN:
                            return true;
                        case MANAGER:
                            return lr.getSender().getRole() == Role.HOD || lr.getSender().getRole() == Role.PM;
                        case HOD:
                            return lr.getSender().getId().equals(user.getId())
                                    || (lr.getSender().getRole() == Role.EMPLOYEE && lr.getReceiver().getId().equals(user.getId()));
                        case PM:
                        case EMPLOYEE:
                            return lr.getSender().getId().equals(user.getId());
                        default:
                            return false;
                    }
                })
                .collect(Collectors.toList());

        //Sắp xếp theo createdAt giảm dần
        filtered = filtered.stream()
                .sorted(Comparator.comparing(LeaveRequest::getCreatedAt).reversed())
                .collect(Collectors.toList());

        // Phân trang thủ công
        int totalElements = filtered.size();
        int totalPages = (int) Math.ceil((double) totalElements / pageSize);
        int fromIndex = Math.min(pageIndex * pageSize, totalElements);
        int toIndex = Math.min(fromIndex + pageSize, totalElements);

        List<LeaveRequestResponse> data = filtered.subList(fromIndex, toIndex).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());

        // Trả về FE
        return ApiResponse.success(
                new PageResult<>(
                        data,
                        totalPages,
                        totalElements,
                        pageIndex + 1
                ),
                "Danh sách đơn nghỉ phép"
        );
    }


    // Duyệt đơn (approve: true=duyệt, false=từ chối)
    public ApiResponse<LeaveRequestResponse> approveOrReject(
            HttpServletRequest request,
            Long requestId,
            boolean approve,
            LeaveRequestApproveRequest approveRequest // <== truyền lên từ Controller
    ) {
        Account current = authService.getCurrentAccount(request);
        Role role = current.getRole();

        Optional<LeaveRequest> optionalLeave = leaveRequestRepository.findById(requestId);
        if (optionalLeave.isEmpty()) {
            return ApiResponse.notfound("Đơn nghỉ phép không tồn tại");
        }
        LeaveRequest entity = optionalLeave.get();

        // Phân quyền duyệt đơn (giữ nguyên như cũ)
        if (role == Role.HOD) {
            if (!(entity.getReceiver().getId().equals(current.getId()) && entity.getSender().getRole() == Role.EMPLOYEE)) {
                return ApiResponse.unauthorized();
            }
        } else if (role == Role.MANAGER) {
            if (!(entity.getReceiver().getId().equals(current.getId()) &&
                    (entity.getSender().getRole() == Role.HOD || entity.getSender().getRole() == Role.PM))) {
                return ApiResponse.unauthorized();
            }
        } else {
            return ApiResponse.unauthorized();
        }

        if (entity.getStatus() != LeaveStatus.PENDING) {
            return ApiResponse.badRequest("Đơn này đã được xử lý");
        }

        if (approve) {
            // Lưu chữ ký nếu có
            if (approveRequest != null && approveRequest.getSignature() != null && !approveRequest.getSignature().isEmpty()) {
                entity.setSignature(approveRequest.getSignature());
            }
            entity.setStatus(LeaveStatus.APPROVED);
        } else {
            entity.setStatus(LeaveStatus.REJECTED);
        }
        leaveRequestRepository.save(entity);

        return ApiResponse.success(toResponse(entity), (approve ? "Duyệt" : "Từ chối") + " đơn nghỉ phép thành công");
    }


    // Convert entity sang response DTO
    private LeaveRequestResponse toResponse(LeaveRequest entity) {
        LeaveRequestResponse dto = new LeaveRequestResponse();
        dto.setId(entity.getId());
        dto.setReason(entity.getReason());
        dto.setStartDate(entity.getStartDate());
        dto.setEndDate(entity.getEndDate());
        dto.setStatus(entity.getStatus().name()); // Enum -> String
        dto.setSender(toAccountResponse(entity.getSender()));
        dto.setReceiver(toAccountResponse(entity.getReceiver()));
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());
        dto.setSignature(entity.getSignature());
        return dto;
    }

    private AccountResponse toAccountResponse(Account account) {
        if (account == null) return null;
        AccountResponse dto = new AccountResponse();
        dto.setId(account.getId());
        dto.setUsername(account.getUsername());
        dto.setRole(account.getRole().name());
        Employee emp = account.getEmployee();
        if (emp != null) {
            String fullName = (emp.getFirstName() + " " + emp.getLastName()).trim();
            dto.setFullName(fullName);
            dto.setEmail(emp.getEmail());
        }
        return dto;
    }

    // Mapping LeaveRequest -> Map<String, String> cho xuất file Word
    public Map<String, String> prepareLeaveRequestDataForWord(LeaveRequest leaveRequest) {
        Map<String, String> data = new HashMap<>();

        // Người nhận
        Account receiver = leaveRequest.getReceiver();
        Employee receiverEmp = receiver != null ? receiver.getEmployee() : null;

        // Người gửi
        Account sender = leaveRequest.getSender();
        Employee senderEmp = sender != null ? sender.getEmployee() : null;

        // Tên người nhận và chức vụ
        data.put("tên người nhận", receiverEmp != null
                ? (receiverEmp.getFirstName() + " " + receiverEmp.getLastName())
                : "");
        data.put("chức vụ người nhận", receiver != null ? receiver.getRole().name() : "");

        // Tên người gửi và chức vụ
        data.put("tên người gửi", senderEmp != null
                ? (senderEmp.getFirstName() + " " + senderEmp.getLastName())
                : "");
        data.put("chức vụ người gửi", sender != null ? sender.getRole().name() : "");

        // Số điện thoại người gửi
        data.put("số điện thoại", senderEmp != null ? senderEmp.getPhone() : "");

        // Ngày bắt đầu/ngày kết thúc nghỉ phép (định dạng dd/MM/yyyy)
        java.time.format.DateTimeFormatter dtf = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy");
        data.put("ngày bắt đầu", leaveRequest.getStartDate() != null
                ? leaveRequest.getStartDate().format(dtf) : "");
        data.put("ngày kết thúc", leaveRequest.getEndDate() != null
                ? leaveRequest.getEndDate().format(dtf) : "");

        // Lý do nghỉ phép
        data.put("lý do", leaveRequest.getReason() != null ? leaveRequest.getReason() : "");

        // Ngày/tháng/năm tạo đơn (lấy từ createdAt, nếu null thì lấy ngày hiện tại)
        java.time.LocalDateTime createdAt = leaveRequest.getCreatedAt();
        if (createdAt == null) createdAt = java.time.LocalDateTime.now();
        data.put("ngày", String.valueOf(createdAt.getDayOfMonth()));
        data.put("tháng", String.valueOf(createdAt.getMonthValue()));
        data.put("năm", String.valueOf(createdAt.getYear()));

        // Ký tên (để trống hoặc logic khác nếu có)
        //data.put("ký tên", "");

        return data;
    }


    public byte[] exportDocumentToWord(Map<String, String> data, String signatureBase64) throws IOException, InvalidFormatException {
        try (
                InputStream template = getClass().getClassLoader().getResourceAsStream("templates/donxinnghiphep.docx");
                XWPFDocument document = new XWPFDocument(template)
        ) {
            // Replace placeholder trong các paragraph ngoài bảng
            for (XWPFParagraph p : document.getParagraphs()) {
                for (XWPFRun run : p.getRuns()) {
                    String runText = run.getText(0);
                    if (runText != null) {
                        // Nếu gặp placeholder ký tên thì chèn ảnh
                        if (runText.contains("{ký tên}")) {
                            run.setText("", 0); // Xóa text
                            if (signatureBase64 != null && !signatureBase64.isEmpty()) {
                                String imgBase64 = signatureBase64.trim();
                                System.out.println("SIGNATURE RECEIVED: " + signatureBase64);
                                if (imgBase64.contains(",")) {
                                    imgBase64 = imgBase64.substring(imgBase64.indexOf(",") + 1);
                                }
                                System.out.println("SIGNATURE FOR DECODE: " + imgBase64);
                                byte[] imgBytes = java.util.Base64.getDecoder().decode(imgBase64);
                                run.addPicture(
                                        new java.io.ByteArrayInputStream(imgBytes),
                                        XWPFDocument.PICTURE_TYPE_PNG,
                                        "signature.png",
                                        Units.toEMU(100), // width (px)
                                        Units.toEMU(40)   // height (px)
                                );
                            }
                        } else {
                            // Thay thế các placeholder khác
                            for (String key : data.keySet()) {
                                String placeholder = "{" + key + "}";
                                if (runText.contains(placeholder)) {
                                    runText = runText.replace(placeholder, data.get(key));
                                }
                            }
                            run.setText(runText, 0);
                        }
                    }
                }
            }
            // Replace trong các bảng (nếu có)
            for (XWPFTable table : document.getTables()) {
                for (XWPFTableRow row : table.getRows()) {
                    for (XWPFTableCell cell : row.getTableCells()) {
                        for (XWPFParagraph p : cell.getParagraphs()) {
                            for (XWPFRun run : p.getRuns()) {
                                String runText = run.getText(0);
                                if (runText != null) {
                                    if (runText.contains("{ký tên}")) {
                                        run.setText("", 0);
                                        if (signatureBase64 != null && !signatureBase64.isEmpty()) {
                                            String imgBase64 = signatureBase64.trim();
                                            System.out.println("SIGNATURE RECEIVED: " + signatureBase64);
                                            if (imgBase64.contains(",")) {
                                                imgBase64 = imgBase64.substring(imgBase64.indexOf(",") + 1);
                                            }
                                            System.out.println("SIGNATURE FOR DECODE: " + imgBase64);
                                            byte[] imgBytes = java.util.Base64.getDecoder().decode(imgBase64);

                                            run.addPicture(
                                                    new ByteArrayInputStream(imgBytes),
                                                    XWPFDocument.PICTURE_TYPE_PNG,
                                                    "signature.png",
                                                    Units.toEMU(100),
                                                    Units.toEMU(40)
                                            );
                                        }
                                    } else {
                                        for (String key : data.keySet()) {
                                            String placeholder = "{" + key + "}";
                                            if (runText.contains(placeholder)) {
                                                runText = runText.replace(placeholder, data.get(key));
                                            }
                                        }
                                        run.setText(runText, 0);
                                    }
                                }
                            }
                        }
                    }
                }
            }
            try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                document.write(out);
                return out.toByteArray();
            }
        }
    }

}
