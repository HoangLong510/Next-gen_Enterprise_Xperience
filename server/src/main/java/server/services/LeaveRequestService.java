package server.services;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.apache.poi.openxml4j.exceptions.InvalidFormatException;
import org.apache.poi.xwpf.usermodel.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import server.dtos.leave_requests.*;
import server.models.Account;
import server.models.Employee;
import server.models.LeaveRequest;
import server.models.SignatureSample;
import server.models.enums.LeaveType;
import server.models.enums.Role;
import server.repositories.AccountRepository;
import server.repositories.LeaveRequestRepository;
import org.apache.poi.util.Units;

import java.io.ByteArrayInputStream;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;


import server.repositories.SignatureSampleRepository;
import server.utils.ApiResponse;
import server.models.enums.LeaveStatus;
import server.utils.HolidayUtils;

import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LeaveRequestService {
    private final SignatureSampleRepository signatureSampleRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final AccountRepository accountRepository;
    private final AuthService authService;
    private final EmailService emailService;
    private static final Logger log = LoggerFactory.getLogger(LeaveRequestService.class);

    // Kiểm tra giao giữa 2 khoảng giờ
    private boolean isTimeOverlap(LocalTime start1, LocalTime end1, LocalTime start2, LocalTime end2) {
        return !start1.isAfter(end2.minusSeconds(1)) && !start2.isAfter(end1.minusSeconds(1));
    }

    // Tính số phút nghỉ hợp lệ trong ca làm việc (8h-12h, 13h-17h), loại trừ giờ nghỉ trưa
    private long calcValidLeaveMinutes(LocalTime start, LocalTime end) {
        LocalTime MORNING_START = LocalTime.of(8, 0);
        LocalTime MORNING_END = LocalTime.of(12, 0);
        LocalTime AFTERNOON_START = LocalTime.of(13, 0);
        LocalTime AFTERNOON_END = LocalTime.of(17, 0);

        if (start.isBefore(MORNING_START) || end.isAfter(AFTERNOON_END) || !start.isBefore(end)) {
            return -1; // invalid
        }
        long total = 0;
        // Nếu nghỉ từ sáng kéo qua chiều
        if (start.isBefore(MORNING_END) && end.isAfter(AFTERNOON_START)) {
            // nghỉ qua trưa
            total += Math.max(0, java.time.Duration.between(start, MORNING_END).toMinutes());
            total += Math.max(0, java.time.Duration.between(AFTERNOON_START, end).toMinutes());
        } else {
            total += java.time.Duration.between(start, end).toMinutes();
        }
        return total;
    }

    // Tạo đơn nghỉ phép
    public ApiResponse<LeaveRequestResponse> create(HttpServletRequest request, LeaveRequestCreateRequest dto) {
        // Thêm log ở đây:
        System.out.println("DTO received: " + dto);
        System.out.println("days: " + dto.getDays());

        Account sender = authService.getCurrentAccount(request);
        Role role = sender.getRole();

        // --- Xử lý nghỉ ngắt quãng ---
        boolean hasRange = dto.getStartDate() != null && dto.getEndDate() != null;
        boolean hasDays = dto.getDays() != null && !dto.getDays().isEmpty();

        if (hasDays && (dto.getStartDate() != null || dto.getEndDate() != null)) {
            return ApiResponse.badRequest("Khi nghỉ ngắt quãng không được truyền startDate/endDate!");
        }
        if (hasRange && hasDays) {
            return ApiResponse.badRequest("Chỉ được chọn 1 trong 2 kiểu: khoảng ngày liên tục hoặc nhiều ngày ngắt quãng!");
        }
        if (!hasRange && !hasDays) {
            return ApiResponse.badRequest("Bạn phải chọn ngày nghỉ phép!");
        }
        // Chuẩn hóa danh sách ngày nghỉ
        List<LocalDate> ngayNghiList;
        if (hasDays) {
            ngayNghiList = new ArrayList<>(dto.getDays());
            ngayNghiList.sort(LocalDate::compareTo);
            Set<LocalDate> set = new HashSet<>(ngayNghiList);
            if (set.size() != ngayNghiList.size()) {
                return ApiResponse.badRequest("Có ngày bị trùng trong danh sách đã xin nghỉ!");
            }
            int month = ngayNghiList.get(0).getMonthValue();
            int year = ngayNghiList.get(0).getYear();
        } else {
            ngayNghiList = new ArrayList<>();
            LocalDate d = dto.getStartDate();
            while (!d.isAfter(dto.getEndDate())) {
                ngayNghiList.add(d);
                d = d.plusDays(1);
            }
        }

        // Thêm log ở đây để biết sau khi xử lý xong danh sách ngày nghỉ
        System.out.println("ngayNghiList: " + ngayNghiList);

        // --- validate chỉ cho phép tháng hiện tại và tháng kế tiếp
        LocalDate now = LocalDate.now();
        int thisMonth = now.getMonthValue();
        int thisYear = now.getYear();
        int nextMonth = thisMonth == 12 ? 1 : thisMonth + 1;
        int nextYear = thisMonth == 12 ? thisYear + 1 : thisYear;

        for (LocalDate d : ngayNghiList) {
            int dMonth = d.getMonthValue();
            int dYear = d.getYear();
            boolean inThisMonth = dMonth == thisMonth && dYear == thisYear;
            boolean inNextMonth = dMonth == nextMonth && dYear == nextYear;
            if (!(inThisMonth || inNextMonth)) {
                return ApiResponse.badRequest("Chỉ được xin nghỉ trong tháng hiện tại và tháng tiếp theo! (Ngày vi phạm: " + d + ")");
            }
        }

        // 1. Validate lý do
        if (dto.getReason() == null || dto.getReason().trim().isEmpty()) {
            return ApiResponse.badRequest("Lý do không được để trống");
        }

        // 2. Validate loại nghỉ phép
        if (dto.getLeaveType() == null) {
            return ApiResponse.badRequest("Bạn phải chọn loại nghỉ phép");
        }

        // 3. Nếu nghỉ theo giờ/nửa ngày thì chỉ 1 ngày duy nhất
        if ((dto.getLeaveType() == LeaveType.CUSTOM_HOURS
                || dto.getLeaveType() == LeaveType.HALF_DAY_MORNING
                || dto.getLeaveType() == LeaveType.HALF_DAY_AFTERNOON)
                && ngayNghiList.size() != 1) {
            return ApiResponse.badRequest("Loại nghỉ " + dto.getLeaveType().name() + " chỉ áp dụng cho 1 ngày duy nhất!");
        }

        // 4. Validate giờ nghỉ hợp lệ
        if (dto.getLeaveType() == LeaveType.CUSTOM_HOURS) {
            if (dto.getStartTime() == null || dto.getEndTime() == null || !dto.getEndTime().isAfter(dto.getStartTime())) {
                return ApiResponse.badRequest("Bạn phải nhập giờ bắt đầu và kết thúc hợp lệ cho loại nghỉ theo giờ");
            }
            long leaveMinutes = calcValidLeaveMinutes(dto.getStartTime(), dto.getEndTime());
            if (leaveMinutes <= 0) {
                return ApiResponse.badRequest("Giờ nghỉ không hợp lệ hoặc nằm ngoài khung giờ làm việc (08:00-12:00, 13:00-17:00)");
            }
            if (leaveMinutes > 8 * 60) {
                return ApiResponse.badRequest("Không được xin nghỉ quá 8 tiếng trong 1 ngày làm việc!");
            }
        }

        // 5. Validate HALF_DAY mặc định khung giờ buổi sáng/chiều, không cần truyền giờ
        if (dto.getLeaveType() == LeaveType.HALF_DAY_MORNING || dto.getLeaveType() == LeaveType.HALF_DAY_AFTERNOON) {
            dto.setStartTime(dto.getLeaveType() == LeaveType.HALF_DAY_MORNING ? LocalTime.of(8, 0) : LocalTime.of(13, 0));
            dto.setEndTime(dto.getLeaveType() == LeaveType.HALF_DAY_MORNING ? LocalTime.of(12, 0) : LocalTime.of(17, 0));
        }

        // 6. Validate ngày lễ, cuối tuần
        for (LocalDate d : ngayNghiList) {
            if (HolidayUtils.isWeekend(d)) {
                return ApiResponse.badRequest("Không được xin nghỉ vào Chủ nhật (" + d + ")");
            }
            if (HolidayUtils.isHoliday(d)) {
                return ApiResponse.badRequest("Không được xin nghỉ vào ngày lễ (" + HolidayUtils.getHolidayName(d) + ")");
            }
        }

        // 7. Validate không trùng đơn đã xin trước đó
        List<LeaveRequest> oldLeaves = leaveRequestRepository.findBySenderIdAndStatus(sender.getId(), LeaveStatus.PENDING);
        oldLeaves.addAll(leaveRequestRepository.findBySenderIdAndStatus(sender.getId(), LeaveStatus.APPROVED));

        LeaveType newType = dto.getLeaveType();
        LocalTime newStartTime = dto.getStartTime();
        LocalTime newEndTime = dto.getEndTime();
        for (LeaveRequest old : oldLeaves) {
            for (LocalDate d : ngayNghiList) {
                if (d.isBefore(old.getStartDate()) || d.isAfter(old.getEndDate())) continue;
                if (old.getLeaveType() == LeaveType.FULL_DAY) {
                    return ApiResponse.badRequest("Bạn đã có đơn nghỉ nguyên ngày " + d + ". Không thể xin thêm bất kỳ loại nghỉ nào khác!");
                }
                if (old.getLeaveType() == LeaveType.HALF_DAY_MORNING && newType == LeaveType.HALF_DAY_MORNING)
                    return ApiResponse.badRequest("Bạn đã có đơn nghỉ buổi sáng ngày " + d);
                if (old.getLeaveType() == LeaveType.HALF_DAY_MORNING && newType == LeaveType.CUSTOM_HOURS &&
                        isTimeOverlap(newStartTime, newEndTime, LocalTime.of(8, 0), LocalTime.of(12, 0))) {
                    return ApiResponse.badRequest("Bạn đã có đơn nghỉ buổi sáng ngày " + d + " (8:00-12:00)");
                }
                if (old.getLeaveType() == LeaveType.HALF_DAY_AFTERNOON && newType == LeaveType.HALF_DAY_AFTERNOON)
                    return ApiResponse.badRequest("Bạn đã có đơn nghỉ buổi chiều ngày " + d);
                if (old.getLeaveType() == LeaveType.HALF_DAY_AFTERNOON && newType == LeaveType.CUSTOM_HOURS &&
                        isTimeOverlap(newStartTime, newEndTime, LocalTime.of(13, 0), LocalTime.of(17, 0))) {
                    return ApiResponse.badRequest("Bạn đã có đơn nghỉ buổi chiều ngày " + d + " (13:00-17:00)");
                }
                if (old.getLeaveType() == LeaveType.CUSTOM_HOURS && d.equals(old.getStartDate())) {
                    if (newType == LeaveType.CUSTOM_HOURS &&
                            isTimeOverlap(newStartTime, newEndTime, old.getStartTime(), old.getEndTime())) {
                        return ApiResponse.badRequest("Bạn đã có đơn nghỉ theo giờ bị trùng khung giờ với ngày " + d);
                    }
                }
            }
        }

        // 8. Phân quyền gửi đơn
        Account receiver = null;
        if (role == Role.EMPLOYEE) {
            Employee senderEmp = sender.getEmployee();
            if (senderEmp == null || senderEmp.getDepartment() == null) {
                return ApiResponse.badRequest("Bạn chưa thuộc phòng ban nào, không thể gửi đơn nghỉ phép");
            }
            Employee hodEmp = senderEmp.getDepartment().getHod();
            if (hodEmp == null || hodEmp.getAccount() == null) {
                return ApiResponse.badRequest("Phòng ban của bạn chưa có trưởng phòng (HOD), không thể gửi đơn nghỉ phép");
            }
            receiver = hodEmp.getAccount();
        } else if (role == Role.HOD || role == Role.PM) {
            Optional<Account> receiverOpt = accountRepository.findById(dto.getReceiverId());
            if (receiverOpt.isEmpty()) {
                return ApiResponse.notfound("Người nhận không tồn tại");
            }
            receiver = receiverOpt.get();
            if (receiver.getRole() != Role.MANAGER) {
                return ApiResponse.badRequest((role == Role.HOD ? "Trưởng phòng" : "PM") + " chỉ được gửi đơn cho giám đốc (MANAGER)");
            }
        } else {
            return ApiResponse.unauthorized();
        }

        // 9. Tạo đơn
        LeaveRequest entity = new LeaveRequest();
        entity.setReason(dto.getReason());
        entity.setStatus(LeaveStatus.PENDING);
        entity.setSender(sender);
        entity.setReceiver(receiver);
        entity.setLeaveType(dto.getLeaveType());
        entity.setStartTime(dto.getStartTime());
        entity.setEndTime(dto.getEndTime());
        // Gán ngày nghỉ
        entity.setStartDate(ngayNghiList.get(0));
        entity.setEndDate(ngayNghiList.get(ngayNghiList.size() - 1));
        // Nếu bạn muốn lưu riêng daysOff (list ngày) thì chỉnh lại entity, còn không thì chỉ cần startDate, endDate.
        entity.setDaysOff(hasDays ? ngayNghiList : null);
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
        Logger log = LoggerFactory.getLogger(getClass());

        Account current = authService.getCurrentAccount(request);
        Role role = current.getRole();

        Optional<LeaveRequest> optionalLeave = leaveRequestRepository.findById(requestId);
        if (optionalLeave.isEmpty()) {
            return ApiResponse.notfound("Đơn nghỉ phép không tồn tại");
        }
        LeaveRequest entity = optionalLeave.get();

        // Phân quyền duyệt đơn
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

        // Xử lý duyệt hoặc từ chối
        // Xử lý duyệt hoặc từ chối
        if (approve) {
            if (approveRequest != null && approveRequest.getSignature() != null && !approveRequest.getSignature().isEmpty()) {
                // Nếu lần đầu duyệt lưu luôn signature vào mẫu
                Optional<SignatureSample> sampleOpt = signatureSampleRepository.findByAccount(current);
                if (sampleOpt.isEmpty()) {
                    SignatureSample sample = new SignatureSample();
                    sample.setAccount(current);
                    sample.setSignatureBase64(approveRequest.getSignature());
                    signatureSampleRepository.save(sample);
                }
                entity.setSignature(approveRequest.getSignature());
            }
            entity.setStatus(LeaveStatus.APPROVED);
        } else {
            entity.setStatus(LeaveStatus.REJECTED);
        }


        // Lưu DB trước, đảm bảo thành công
        leaveRequestRepository.save(entity);

        // Gửi email ASYNC (background)
        try {
            Account sender = entity.getSender();
            Employee senderEmp = sender.getEmployee();
            if (senderEmp != null && senderEmp.getEmail() != null) {
                String applicantName = (senderEmp.getFirstName() + " " + senderEmp.getLastName()).trim();
                String to = senderEmp.getEmail();

                if (approve) {
                    emailService.sendApproveEmailAsync(
                            to,
                            applicantName,
                            entity.getLeaveType(),
                            entity.getStartDate(),
                            entity.getEndDate(),
                            entity.getDaysOff(),
                            entity.getStartTime(),
                            entity.getEndTime()
                    );
                } else {
                    String reason = (approveRequest != null && approveRequest.getRejectReason() != null && !approveRequest.getRejectReason().isEmpty())
                            ? approveRequest.getRejectReason()
                            : "Không rõ lý do";
                    emailService.sendRejectEmailAsync(to, applicantName, reason); // gọi ASYNC
                }
            }
        } catch (Exception e) {
            log.warn("Gửi email thông báo trạng thái đơn nghỉ phép thất bại: " + e.getMessage());
        }

        // Trả response thành công, không bị ảnh hưởng bởi email
        return ApiResponse.success(
                toResponse(entity),
                (approve ? "Duyệt" : "Từ chối") + " đơn nghỉ phép thành công"
        );
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
        dto.setLeaveType(entity.getLeaveType());
        dto.setStartTime(entity.getStartTime());
        dto.setEndTime(entity.getEndTime());
        dto.setDaysOff(entity.getDaysOff());
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
            dto.setPhone(emp.getPhone());
        }
        return dto;
    }

    // Mapping LeaveRequest -> Map<String, String> cho xuất file Word
    public Map<String, String> prepareLeaveRequestDataForWord(LeaveRequest leaveRequest, List<LeaveRequest> splitLeaves) {
        Map<String, String> data = new HashMap<>();

        // Người nhận
        Account receiver = leaveRequest.getReceiver();
        Employee receiverEmp = receiver != null ? receiver.getEmployee() : null;

        // Người gửi
        Account sender = leaveRequest.getSender();
        Employee senderEmp = sender != null ? sender.getEmployee() : null;

        data.put("tên người nhận", receiverEmp != null
                ? (receiverEmp.getFirstName() + " " + receiverEmp.getLastName())
                : "");
        data.put("chức vụ người nhận", receiver != null ? receiver.getRole().name() : "");
        data.put("tên người gửi", senderEmp != null
                ? (senderEmp.getFirstName() + " " + senderEmp.getLastName())
                : "");
        data.put("chức vụ người gửi", sender != null ? sender.getRole().name() : "");
        data.put("số điện thoại", senderEmp != null ? senderEmp.getPhone() : "");
        data.put("gmail", senderEmp != null ? senderEmp.getEmail() : "");
        data.put("lý do", leaveRequest.getReason() != null ? leaveRequest.getReason() : "");

        // --- Thời gian nghỉ (xử lý thông minh cho từng trường hợp) ---
        DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("HH:mm");
        StringBuilder timeStr = new StringBuilder();

        if (splitLeaves != null && !splitLeaves.isEmpty()) {
            // Nhiều đơn nghỉ ngắt quãng (dạng: - Ngày 02/08/2025 (sáng), - Ngày 03/08/2025 (13:00-15:30), ...)
            for (LeaveRequest l : splitLeaves) {
                timeStr.append("- Ngày ").append(l.getStartDate().format(dateFmt));
                switch (l.getLeaveType()) {
                    case FULL_DAY -> timeStr.append(" (cả ngày)");
                    case HALF_DAY_MORNING -> timeStr.append(" (sáng 8:00-12:00)");
                    case HALF_DAY_AFTERNOON -> timeStr.append(" (chiều 13:00-17:00)");
                    case CUSTOM_HOURS -> timeStr.append(" (").append(l.getStartTime().format(timeFmt)).append(" - ").append(l.getEndTime().format(timeFmt)).append(")");
                }
                timeStr.append("\n");
            }
        } else {
            // Đơn nghỉ liên tục (ngày hoặc giờ)
            LocalDate from = leaveRequest.getStartDate();
            LocalDate to = leaveRequest.getEndDate();
            LeaveType type = leaveRequest.getLeaveType();
            if (type == LeaveType.FULL_DAY && from.equals(to)) {
                timeStr.append("Ngày ").append(from.format(dateFmt)).append(" (cả ngày)");
            } else if (type == LeaveType.FULL_DAY) {
                timeStr.append("Từ ngày ").append(from.format(dateFmt)).append(" đến hết ngày ").append(to.format(dateFmt));
            } else if (type == LeaveType.HALF_DAY_MORNING || type == LeaveType.HALF_DAY_AFTERNOON) {
                String part = (type == LeaveType.HALF_DAY_MORNING ? "sáng 8:00-12:00" : "chiều 13:00-17:00");
                timeStr.append("Ngày ").append(from.format(dateFmt)).append(" (").append(part).append(")");
            } else if (type == LeaveType.CUSTOM_HOURS) {
                timeStr.append("Ngày ").append(from.format(dateFmt))
                        .append(" (")
                        .append(leaveRequest.getStartTime().format(timeFmt))
                        .append(" - ")
                        .append(leaveRequest.getEndTime().format(timeFmt))
                        .append(")");
            }
        }
        data.put("thời gian nghỉ", timeStr.toString().trim());

        // Ngày/tháng/năm tạo đơn (lấy từ createdAt, nếu null thì lấy ngày hiện tại)
        java.time.LocalDateTime createdAt = leaveRequest.getCreatedAt();
        if (createdAt == null) createdAt = java.time.LocalDateTime.now();
        data.put("ngày", String.valueOf(createdAt.getDayOfMonth()));
        data.put("tháng", String.valueOf(createdAt.getMonthValue()));
        data.put("năm", String.valueOf(createdAt.getYear()));

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

    // Lấy chi tiết đơn nghỉ phép
    public ApiResponse<LeaveRequestResponse> getDetail(Long id, HttpServletRequest request) {
        Account user = authService.getCurrentAccount(request);
        Optional<LeaveRequest> opt = leaveRequestRepository.findById(id);
        if (opt.isEmpty()) {
            return ApiResponse.notfound("Không tìm thấy đơn nghỉ phép");
        }

        LeaveRequest leave = opt.get();
        // Kiểm tra quyền xem:
        // - là sender hoặc receiver của đơn
        // - hoặc ADMIN
        // - hoặc MANAGER/HOD theo phân quyền của bạn (tùy business)
        Role role = user.getRole();
        boolean canView =
                Objects.equals(leave.getSender().getId(), user.getId()) ||
                        Objects.equals(leave.getReceiver().getId(), user.getId()) ||
                        role == Role.ADMIN ||
                        (role == Role.MANAGER && (leave.getSender().getRole() == Role.HOD || leave.getSender().getRole() == Role.PM)) ||
                        (role == Role.HOD && (leave.getSender().getRole() == Role.EMPLOYEE || leave.getSender().getId().equals(user.getId())));

        if (!canView) {
            return ApiResponse.unauthorized();
        }

        return ApiResponse.success(toResponse(leave), "Chi tiết đơn nghỉ phép");
    }


    public ApiResponse<?> getBusyDays(Long departmentId, String month) {
        YearMonth ym = YearMonth.parse(month);
        LocalDate start = ym.atDay(1);
        LocalDate end = ym.atEndOfMonth();

        List<LeaveRequest> approvedLeaves = leaveRequestRepository.findApprovedInMonth(departmentId, start, end);

        Map<LocalDate, Integer> busyDayMap = new LinkedHashMap<>();
        for (LocalDate d = start; !d.isAfter(end); d = d.plusDays(1)) {
            busyDayMap.put(d, 0);
        }

        for (LeaveRequest lr : approvedLeaves) {
            LocalDate from = lr.getStartDate().isBefore(start) ? start : lr.getStartDate();
            LocalDate to = lr.getEndDate().isAfter(end) ? end : lr.getEndDate();
            for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
                busyDayMap.computeIfPresent(d, (k, v) -> v + 1);
            }
        }

        List<Map<String, Object>> busyDays = busyDayMap.entrySet().stream()
                .map(e -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("date", e.getKey().toString());
                    m.put("count", e.getValue());
                    return m;
                })
                .collect(Collectors.toList());
        return ApiResponse.success(busyDays, "Lấy danh sách ngày bận thành công");
    }

    public ApiResponse<?> getLeaveBalance(HttpServletRequest request, String month) {
        Account user = authService.getCurrentAccount(request);
        int year = YearMonth.parse(month).getYear();
        int monthValue = YearMonth.parse(month).getMonthValue();

        // Lấy tất cả đơn nghỉ phép APPROVED của user
        List<LeaveRequest> leaves = leaveRequestRepository.findBySenderIdAndStatus(user.getId(), LeaveStatus.APPROVED);

        // Tổng ngày phép đã nghỉ trong năm & tháng (cộng từng ngày)
        int daysUsedYear = 0;
        int daysUsedMonth = 0;
        for (LeaveRequest leave : leaves) {
            LocalDate from = leave.getStartDate();
            LocalDate to = leave.getEndDate();
            for (LocalDate date = from; !date.isAfter(to); date = date.plusDays(1)) {
                if (date.getYear() == year) daysUsedYear++;
                if (date.getYear() == year && date.getMonthValue() == monthValue) daysUsedMonth++;
            }
        }

        int limitPerYear = 12;
        int limitPerMonth = 1;
        int leaveLeftInYear = limitPerYear - daysUsedYear;
        int leaveLeftInMonth = limitPerMonth - daysUsedMonth;

        Map<String, Object> data = new HashMap<>();
        data.put("leaveUsedInYear", daysUsedYear);
        data.put("leaveLeftInYear", leaveLeftInYear);
        data.put("leaveUsedInMonth", daysUsedMonth);
        data.put("leaveLeftInMonth", leaveLeftInMonth);
        data.put("limitPerYear", limitPerYear);
        data.put("limitPerMonth", limitPerMonth);

        return ApiResponse.success(data, "Leave balance calculated successfully");
    }



}
