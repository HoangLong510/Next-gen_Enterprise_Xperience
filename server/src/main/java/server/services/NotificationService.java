package server.services;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import server.dtos.NotificationResponse;
import server.models.*;
import server.models.enums.*;
import server.repositories.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final AccountRepository accountRepository;
    private final DocumentRepository documentRepository;
    // TODO: enable khi có project
    // private final ProjectRepository projectRepository;
    // TODO: enable khi có task
    // private final TaskRepository taskRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final LeaveRequestRepository leaveRequestRepository;
    private final AttendanceRepository attendanceRepository;

    private void notifyMany(List<Account> recipients, Account sender, String title, String content, NotificationType type, Long referenceId) {
        for (Account acc : recipients) {
            saveAndSendNotification(acc, sender, title, content, type, referenceId);
        }
    }

    public NotificationResponse createNotification(NotificationType type, Long referenceId, boolean isResult) {

        Account recipient = null;
        Account sender = null;
        String title = "";
        String content = "";

        switch (type) {
            case PROJECT -> {
                Document doc = documentRepository.findById(referenceId)
                        .orElseThrow(() -> new IllegalArgumentException("Document not found"));

                Project project = doc.getProject();
                if (project == null) return null;

                if (!isResult) {
                    // Dự án vừa được tạo
                    List<Account> recipients = List.of(doc.getCreatedBy(), doc.getReceiver());
                    sender = doc.getPm();
                    title = "Dự án mới đã được khởi tạo";
                    content = "Công văn '" + doc.getTitle() + "' đã được PM tạo dự án thành công.";

                    notifyMany(recipients, sender, title, content, NotificationType.PROJECT, project.getId());
                }

                return null;
            }
            case DOCUMENT -> {
                Document doc = documentRepository.findById(referenceId)
                        .orElseThrow(() -> new IllegalArgumentException("Document not found"));
                if (isResult && doc.getType() == DocumentType.ADMINISTRATIVE && doc.getStatus() == DocumentStatus.IN_PROGRESS) {
                    recipient = doc.getAccountant();
                    sender = doc.getReceiver();
                    title = "Công văn tài chính đã được ký";
                    content = "Bạn nhận được công văn tài chính đã được giám đốc ký hãy bắt đầu dự án: '" + doc.getTitle() + "'.";
                }
                // Nếu document đã ký nhưng chưa hoàn thành => gửi cho PM
                else if (isResult && doc.getStatus() == DocumentStatus.SIGNED) {
                    recipient = doc.getPm(); // PM nhận xử lý
                    sender = doc.getReceiver();
                    title = "Công văn đã được ký";
                    content = "Công văn '" + doc.getTitle() + "' đã được giám đốc ký, bạn cần xử lý.";
                }

                // Nếu PM xử lý hoàn thành (COMPLETED)
                else if (isResult && doc.getStatus() == DocumentStatus.COMPLETED) {
                    recipient = doc.getCreatedBy(); // Thư ký/người tạo nhận kết quả
                    sender = doc.getPm(); // PM gửi kết quả
                    title = "Kết quả xử lý công văn";
                    content = "Công văn '" + doc.getTitle() + "' đã được xử lý.";
                }
                // Khi vừa tạo công văn PROJECT
                else if (!isResult && doc.getType() == DocumentType.PROJECT) {
                    // Giám đốc
                    saveAndSendNotification(
                            doc.getReceiver(),
                            doc.getCreatedBy(),
                            "Công văn dự án mới cần ký",
                            "Bạn có công văn dự án mới cần ký duyệt.",
                            type, referenceId
                    );
                    // PM
                    if (doc.getPm() != null) {
                        saveAndSendNotification(
                                doc.getPm(),
                                doc.getCreatedBy(),
                                "Bạn được giao công văn dự án mới",
                                "Bạn được chỉ định làm Project Manager cho công văn: '" + doc.getTitle() + "'.",
                                type, referenceId
                        );
                    }
                    return null;
                }

                else if (!isResult && doc.getType() == DocumentType.ADMINISTRATIVE) {
                    // Gửi cho giám đốc (người ký)
                    if (doc.getReceiver() == null) throw new IllegalArgumentException("Document has no receiver assigned");
                    saveAndSendNotification(
                            doc.getReceiver(),
                            doc.getCreatedBy(),
                            "Công văn tài chính mới cần ký",
                            "Bạn có công văn tài chính mới cần ký duyệt.",
                            type, referenceId
                    );

                    // Gửi cho kế toán (người xử lý)
                    if (doc.getAccountant() == null) throw new IllegalArgumentException("Document has no accountant assigned");
                    saveAndSendNotification(
                            doc.getAccountant(),
                            doc.getCreatedBy(),
                            "Công văn tài chính mới cần xử lý",
                            "Bạn được giao xử lý công văn tài chính: '" + doc.getTitle() + "'.",
                            type, referenceId
                    );

                    return null;
                }

                // Các loại công văn còn lại
                else if (!isResult) {
                    recipient = doc.getReceiver();
                    if (recipient == null) throw new IllegalArgumentException("Document has no receiver assigned");
                    sender = doc.getCreatedBy();
                    title = "Công văn mới cần xử lý";
                    content = "Công văn: " + doc.getTitle();
                }
            }
            case LEAVE_REQUEST -> {
                LeaveRequest leaveRequest = leaveRequestRepository.findById(referenceId)
                        .orElseThrow(() -> new IllegalArgumentException("Leave request not found"));

                if (isResult) {
                    recipient = leaveRequest.getSender();
                    sender = leaveRequest.getReceiver();
                    String action;
                    if (leaveRequest.getStatus() == LeaveStatus.APPROVED) {
                        action = "đã được duyệt";
                    } else if (leaveRequest.getStatus() == LeaveStatus.REJECTED) {
                        action = "đã bị từ chối";
                    } else if (leaveRequest.getStatus() == LeaveStatus.CANCELLED) {
                        action = "đã bị hủy";
                    } else { // PENDING hoặc các trạng thái khác
                        action = "đang chờ duyệt";
                    }
                    title = "Kết quả duyệt đơn nghỉ phép";
                    content = "Đơn nghỉ phép của bạn " + action + " bởi " +
                            sender.getEmployee().getFirstName() + " " + sender.getEmployee().getLastName();
                } else {
                    recipient = leaveRequest.getReceiver();
                    sender = leaveRequest.getSender();
                    title = "Đơn nghỉ phép mới cần duyệt";
                    content = "Đơn nghỉ phép của: " + sender.getEmployee().getFirstName() + " " + sender.getEmployee().getLastName();
                }
            }
            case ATTENDANCE -> {
                if (!isResult) {
                    // Trường hợp nhắc nhở
                    // Phân biệt nhắc nhở hàng ngày và nhắc nhở ngày 8 theo ngày chấm công của bản ghi
                    LocalDate checkInDate = attendanceRepository.findById(referenceId)
                            .map(Attendance::getCheckInTime)
                            .map(LocalDateTime::toLocalDate)
                            .orElse(LocalDate.now());

                    LocalDate today = LocalDate.now();
                    LocalDate firstDayPrevMonth = today.minusMonths(1).withDayOfMonth(1);
                    LocalDate lastDayPrevMonth = today.minusMonths(1).withDayOfMonth(today.minusMonths(1).lengthOfMonth());

                    if (!checkInDate.isBefore(firstDayPrevMonth) && !checkInDate.isAfter(lastDayPrevMonth)) {
                        // Nếu checkInDate nằm trong tháng trước → thông báo ngày 8 hàng tháng
                        recipient = attendanceRepository.findById(referenceId)
                                .map(Attendance::getAccount)
                                .orElse(null);
                        sender = null; // hệ thống
                        title = "Nhắc nhở thiếu check-out tháng trước";
                        content = "Bạn chưa check-out cho ngày " + checkInDate + " thuộc tháng trước. Vui lòng kiểm tra và bổ sung thông tin trước ngày nhận lương.";
                    } else {
                        // Nhắc nhở hàng ngày
                        recipient = attendanceRepository.findById(referenceId)
                                .map(Attendance::getAccount)
                                .orElse(null);
                        sender = null; // hệ thống
                        title = "Nhắc nhở chưa check-out hôm nay";
                        content = "Bạn chưa thực hiện check-out cho ngày " + checkInDate + ". Vui lòng kiểm tra và cập nhật.";
                    }
                    if (recipient == null) return null; // nếu không có người nhận thì bỏ qua
                    saveAndSendNotification(recipient, sender, title, content, type, referenceId);
                    return null;
                } else {
                    // Kết quả HR giải trình
                    Attendance att = attendanceRepository.findById(referenceId)
                            .orElseThrow(() -> new IllegalArgumentException("Attendance record not found"));
                    recipient = att.getAccount();
                    Account hr = findHRAccount();
                    sender = hr; // HR hoặc hệ thống

                    if (att.getStatus() == AttendanceStatus.RESOLVED) {
                        title = "Kết quả giải trình thiếu check-out";
                        content = "Giải trình thiếu check-out của bạn đã được phê duyệt. Vui lòng kiểm tra lại.";
                    } else if (att.getStatus() == AttendanceStatus.REJECTED) {
                        title = "Giải trình thiếu check-out không được duyệt";
                        content = "Giải trình thiếu check-out của bạn không được phê duyệt: "
                                + (att.getCheckOutNote() != null ? att.getCheckOutNote() : "");
                    }
                }
            }

            case ORDER -> {
                recipient = accountRepository.findByUsername("admin")
                        .orElseThrow(() -> new IllegalArgumentException("Admin account not found"));
                sender = null;
                if (isResult) {
                    title = "Kết quả xử lý đơn hàng";
                    content = "Đơn hàng của bạn đã được xử lý.";
                } else {
                    title = "Đơn hàng mới";
                    content = "Bạn có một đơn hàng mới cần xử lý";
                }
            }
            case GENERAL -> {
                recipient = accountRepository.findByUsername("admin")
                        .orElseThrow(() -> new IllegalArgumentException("Admin account not found"));
                sender = null;
                title = "Thông báo hệ thống";
                content = "Hệ thống có thông báo mới.";
            }
            // thêm các case khác nếu có
            default -> throw new IllegalArgumentException("Unsupported notification type");
        }

        if (recipient == null) {
            throw new IllegalStateException("Recipient must not be null");
        }

        return saveAndSendNotification(recipient, sender, title, content, type, referenceId);
    }

    public void notifyHROnNoteSubmission(Long attendanceId) {
        Attendance att = attendanceRepository.findById(attendanceId)
                .orElseThrow(() -> new RuntimeException("Attendance record not found"));

        Account hr = findHRAccount(); // hàm lấy HR (vd: theo role hoặc username)
        if (hr == null) return;

        Account employee = att.getAccount();

        String title = "Nhân viên gửi ghi chú giải trình thiếu check-out";
        String content = "Nhân viên " + employee.getUsername() + " đã gửi ghi chú giải trình cho ngày " + att.getCheckInTime().toLocalDate() + ". Vui lòng kiểm tra.";

        saveAndSendNotification(hr, employee, title, content, NotificationType.ATTENDANCE, attendanceId);
    }

    private Account findHRAccount() {
        return accountRepository.findByRole(Role.HR)
                .stream()
                .findFirst()
                .orElse(null);
    }


    public List<NotificationResponse> getByRecipient(String username) {
        var list = notificationRepository.findByRecipient_UsernameOrderByCreatedAtDesc(username);
        return list.stream().map(this::mapToResponse).toList();
    }

    public void markAsRead(Long id) {
        notificationRepository.findById(id).ifPresent(n -> {
            n.setRead(true);
            notificationRepository.save(n);
        });
    }


    private NotificationResponse mapToResponse(Notification n) {
        var dto = new NotificationResponse();
        dto.setId(n.getId());
        dto.setTitle(n.getTitle());
        dto.setContent(n.getContent());
        dto.setRecipient(n.getRecipient().getUsername());
        dto.setRead(n.isRead());
        dto.setCreatedAt(n.getCreatedAt());
        dto.setType(n.getType());
        dto.setReferenceId(n.getReferenceId());

        if (n.getCreatedBy() != null) {
            dto.setSenderUsername(n.getCreatedBy().getUsername());
            if (n.getCreatedBy().getEmployee() != null) {
                var emp = n.getCreatedBy().getEmployee();
                dto.setSenderFullName(emp.getFirstName() + " " + emp.getLastName());
                dto.setSenderAvatar(emp.getAvatar());
            } else {
                dto.setSenderFullName(n.getCreatedBy().getUsername());
            }
        } else {
            dto.setSenderUsername("System");
            dto.setSenderFullName("Hệ thống");
            dto.setSenderAvatar(null);
        }

        return dto;
    }

    private NotificationResponse saveAndSendNotification(
            Account recipient,
            Account sender,
            String title,
            String content,
            NotificationType type,
            Long referenceId
    ) {
        Notification noti = Notification.builder()
                .title(title)
                .content(content)
                .recipient(recipient)
                .createdBy(sender)
                .read(false)
                .createdAt(LocalDateTime.now())
                .type(type)
                .referenceId(referenceId)
                .build();

        Notification saved = notificationRepository.save(noti);
        messagingTemplate.convertAndSend(
                "/topic/notifications/" + recipient.getUsername(),
                mapToResponse(saved)
        );
        return mapToResponse(saved);
    }
}
