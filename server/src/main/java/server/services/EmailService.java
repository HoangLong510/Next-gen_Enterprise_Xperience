package server.services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import server.models.enums.LeaveType;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    // Reject: Không cần sửa
    @Async
    public void sendRejectEmailAsync(String to, String applicantName, String reason) {
        sendRejectEmail(to, applicantName, reason);
    }

    public void sendRejectEmail(String to, String applicantName, String reason) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);
        message.setSubject("Thông báo từ chối đơn nghỉ phép");
        message.setText("Xin chào " + applicantName + ",\n\n" +
                "Đơn nghỉ phép của bạn đã bị từ chối với lý do: " + reason + "\n\n" +
                "Vui lòng liên hệ bộ phận quản lý để biết thêm chi tiết.\n\nTrân trọng!");
        mailSender.send(message);
    }

    // ----------- APPROVE EMAIL LOGIC (MỚI) ------------

    /**
     * Hàm gửi mail async - truyền đủ thông tin loại đơn (nên dùng)
     */
    @Async
    public void sendApproveEmailAsync(
            String to,
            String applicantName,
            LeaveType leaveType,
            LocalDate startDate,
            LocalDate endDate,
            List<LocalDate> daysOff,
            LocalTime startTime,
            LocalTime endTime
    ) {
        sendApproveEmail(to, applicantName, leaveType, startDate, endDate, daysOff, startTime, endTime);
    }

    /**
     * Hàm gửi mail duyệt phép - support mọi loại đơn
     */
    public void sendApproveEmail(
            String to,
            String applicantName,
            LeaveType leaveType,
            LocalDate startDate,
            LocalDate endDate,
            List<LocalDate> daysOff,
            LocalTime startTime,
            LocalTime endTime
    ) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);
        message.setSubject("Đơn nghỉ phép đã được duyệt");

        StringBuilder detail = new StringBuilder();

        DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");

        if (leaveType == LeaveType.FULL_DAY && daysOff != null && !daysOff.isEmpty()) {
            // Nghỉ ngắt quãng
            detail.append("Các ngày: ");
            for (int i = 0; i < daysOff.size(); i++) {
                detail.append(daysOff.get(i).format(dateFmt));
                if (i < daysOff.size() - 1) detail.append(", ");
            }
        } else if (leaveType == LeaveType.FULL_DAY && startDate != null && endDate != null) {
            if (startDate.equals(endDate)) {
                detail.append("Ngày: ").append(startDate.format(dateFmt));
            } else {
                detail.append("Từ ngày: ").append(startDate.format(dateFmt))
                        .append(" đến hết ngày: ").append(endDate.format(dateFmt));
            }
        } else if (leaveType == LeaveType.HALF_DAY_MORNING || leaveType == LeaveType.HALF_DAY_AFTERNOON) {
            String timeRange = leaveType == LeaveType.HALF_DAY_MORNING ? "8:00-12:00" : "13:00-17:00";
            detail.append("Ngày: ").append(startDate.format(dateFmt))
                    .append(" (").append(timeRange).append(")");
        } else if (leaveType == LeaveType.CUSTOM_HOURS && startTime != null && endTime != null) {
            DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("HH:mm");
            detail.append("Ngày: ").append(startDate.format(dateFmt))
                    .append(" (").append(startTime.format(timeFmt))
                    .append(" - ").append(endTime.format(timeFmt)).append(")");
        } else {
            detail.append("Chi tiết thời gian nghỉ: không xác định!");
        }

        message.setText("Xin chào " + applicantName + ",\n\n"
                + "Đơn xin nghỉ phép của bạn đã được duyệt cho thời gian:\n"
                + detail + "\n\n"
                + "Chúc bạn nghỉ phép vui vẻ!\n\nTrân trọng!");

        mailSender.send(message);
    }

    // ----------- (Legacy) Nếu code cũ vẫn gọi kiểu cũ thì giữ lại cho tương thích -----------

    @Async
    public void sendApproveEmailAsync(String to, String applicantName, String startDate, String endDate) {
        // Gọi bản mới, convert startDate/endDate sang LocalDate, loại đơn default FULL_DAY
        sendApproveEmail(
                to,
                applicantName,
                LeaveType.FULL_DAY,
                startDate != null ? LocalDate.parse(startDate) : null,
                endDate != null ? LocalDate.parse(endDate) : null,
                null,
                null,
                null
        );
    }

    public void sendApproveEmail(String to, String applicantName, String startDate, String endDate) {
        // Legacy: mặc định loại FULL_DAY, không truyền daysOff/startTime/endTime
        sendApproveEmail(
                to,
                applicantName,
                LeaveType.FULL_DAY,
                startDate != null ? LocalDate.parse(startDate) : null,
                endDate != null ? LocalDate.parse(endDate) : null,
                null,
                null,
                null
        );
    }
}
