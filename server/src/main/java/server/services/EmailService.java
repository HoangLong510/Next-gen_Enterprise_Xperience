package server.services;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import jakarta.mail.util.ByteArrayDataSource;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import server.models.enums.ContractType;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.Locale;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;
import server.models.enums.LeaveStatus;
import server.models.enums.LeaveType;

import java.time.LocalTime;
import java.util.List;

import java.io.UnsupportedEncodingException;

@Service
@RequiredArgsConstructor
public class EmailService {

    @Value("${app.client.url}")
    private String client_url;
    @Value("${app.app-name:${spring.application.name:NEX}}")
    private String app_name;

    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;

    // ========== GỬI EMAIL TẠO TÀI KHOẢN (HTML) ==========
    @Async
    public void sendAccountCreatedEmail(String toEmail, String username, String password) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            Context context = new Context();
            context.setVariable("username", username);
            context.setVariable("password", password);
            context.setVariable("loginUrl", client_url + "/auth/login");

            String htmlContent = templateEngine.process("email/account-created.html", context);

            helper.setFrom(new InternetAddress("no-reply@example.com", app_name));
            helper.setTo(toEmail);
            helper.setSubject("New account creation notification");
            helper.setText(htmlContent, true);

            mailSender.send(message);
        } catch (MessagingException | UnsupportedEncodingException e) {
            e.printStackTrace();
        }
    }

    @Async
    public void sendAccountResetPasswordEmail(String toEmail, String username, String password) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            Context context = new Context();
            context.setVariable("username", username);
            context.setVariable("password", password);
            context.setVariable("loginUrl", client_url + "/auth/login");

            String htmlContent = templateEngine.process("email/account-reset-password.html", context);

            helper.setFrom(new InternetAddress("no-reply@example.com", app_name));
            helper.setTo(toEmail);
            helper.setSubject("Reset account password notification");
            helper.setText(htmlContent, true);

            mailSender.send(message);
        } catch (MessagingException | UnsupportedEncodingException e) {
            e.printStackTrace();
        }
    }

    @Async
    public void sendAccountDisabledEmail(String toEmail, String firstName, String lastName, String username) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            Context context = new Context();
            context.setVariable("username", username);
            context.setVariable("firstName", firstName);
            context.setVariable("lastName", lastName);

            String htmlContent = templateEngine.process("email/account-disabled.html", context);

            helper.setFrom(new InternetAddress("no-reply@example.com", app_name));
            helper.setTo(toEmail);
            helper.setSubject("Disabled account notification");
            helper.setText(htmlContent, true);

            mailSender.send(message);
        } catch (MessagingException | UnsupportedEncodingException e) {
            e.printStackTrace();
        }
    }

    @Async
    public void sendAccountEnabledEmail(String toEmail, String firstName, String lastName, String username) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            Context context = new Context();
            context.setVariable("username", username);
            context.setVariable("firstName", firstName);
            context.setVariable("lastName", lastName);

            String htmlContent = templateEngine.process("email/account-enabled.html", context);

            helper.setFrom(new InternetAddress("no-reply@example.com", app_name));
            helper.setTo(toEmail);
            helper.setSubject("Enabled account notification");
            helper.setText(htmlContent, true);

            mailSender.send(message);
        } catch (MessagingException | UnsupportedEncodingException e) {
            e.printStackTrace();
        }
    }

    // ========== GỬI EMAIL TỪ CHỐI ĐƠN NGHỈ ==========
    @Async
    public void sendRejectEmailAsync(String to, String applicantName, String reason) {
        sendRejectEmail(to, applicantName, reason);
    }

    public void sendRejectEmail(String to, String applicantName, String reason) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);
        message.setSubject("Thông báo từ chối đơn xin nghỉ phép");
        message.setText("Xin chào " + applicantName + ",\n\n" +
                "Đại diện Công Ty TNHH NEX, phòng quản lý nhân sự xin thông báo:\n\n"+
                "Đơn nghỉ phép của bạn đã bị từ chối với lý do: " + reason + "\n\n" +
                "Vui lòng liên hệ bộ phận quản lý để biết thêm chi tiết.\n\nTrân trọng!");
        mailSender.send(message);
    }

    // ========== GỬI EMAIL DUYỆT ĐƠN NGHỈ ==========
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
        message.setSubject("Đơn xin nghỉ phép đã được duyệt");

        StringBuilder detail = new StringBuilder();
        DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");

        if (leaveType == LeaveType.FULL_DAY && daysOff != null && !daysOff.isEmpty()) {
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
                +"Đại diện Công Ty TNHH NEX, phòng quản lý nhân sự xin thông báo:\n\n"
                + "Đơn xin nghỉ phép của bạn đã được duyệt cho thời gian:\n"
                + detail + "\n\n"
                + "Chúc bạn nghỉ phép vui vẻ!\n\nTrân trọng!");

        mailSender.send(message);
    }

    // ========== LEGACY SUPPORT ==========
    @Async
    public void sendApproveEmailAsync(String to, String applicantName, String startDate, String endDate) {
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


    // ========== GỬI EMAIL: HỢP ĐỒNG ACTIVE ==========
    @Async
    public void sendContractActivatedEmailAsync(
            String to,
            String employeeName,
            String contractCode,
            ContractType contractType,
            LocalDate startDate,
            LocalDate endDate,
            BigDecimal basicSalary
    ) {
        sendContractActivatedEmail(to, employeeName, contractCode, contractType, startDate, endDate, basicSalary);
    }

    public void sendContractActivatedEmail(
            String to,
            String employeeName,
            String contractCode,
            ContractType contractType,
            LocalDate startDate,
            LocalDate endDate,
            BigDecimal basicSalary
    ) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);
        message.setSubject("Thông báo: Hợp đồng lao động đã có hiệu lực");

        DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        NumberFormat nf = NumberFormat.getInstance(new Locale("vi", "VN"));

        String typeLabel = switch (contractType) {
            case PERMANENT -> "Chính thức";
            case PROBATION -> "Thử việc";
            case TEMPORARY -> "Thời vụ";
            default -> "";
        };

        String salaryStr = basicSalary != null ? nf.format(basicSalary) + " VND" : "—";
        String startStr  = startDate != null ? startDate.format(dateFmt) : "—";
        String endStr    = endDate   != null ? endDate.format(dateFmt)   : "—";

        String fullName = (employeeName == null || employeeName.isBlank()) ? "Anh/Chị" : employeeName;

        message.setText(
                "Xin chào " + fullName + ",\n\n" +
                        "Đại diện Công Ty TNHH NEX, tôi xin chân trọng thông báo:\n\n" +
                        "Hợp đồng lao động của bạn đã có hiệu lực (ACTIVE).\n\n" +
                        "• Mã HĐ: " + (contractCode != null ? contractCode : "—") + "\n" +
                        "• Loại: " + typeLabel + "\n" +
                        "• Thời hạn: " + startStr + " – " + endStr + "\n" +
                        "• Lương cơ bản: " + salaryStr + "\n\n" +
                        "Nếu bạn có bất kỳ thắc mắc nào, vui lòng liên hệ phòng Nhân sự.\n\n" +
                        "Trân trọng,\n" +
                        "Hệ thống NEX HR"
        );

        mailSender.send(message);
    }

    // ========== GỬI EMAIL: HR TỪ CHỐI XÁC NHẬN ==========
    @Async
    public void sendHrRejectEmailToApplicantAsync(
            String toEmail,
            String applicantName,
            String approverName,
            String reason
    ) {
        sendHrRejectEmailToApplicant(toEmail, applicantName, approverName, reason);
    }

    public void sendHrRejectEmailToApplicant(
            String toEmail,
            String applicantName,
            String approverName,
            String reason
    ) {
        String aName = (applicantName == null || applicantName.isBlank()) ? "Anh/Chị" : applicantName;
        String apvName = (approverName == null || approverName.isBlank()) ? "Người duyệt" : approverName;
        String rsn = (reason == null || reason.isBlank()) ? "Không rõ lý do" : reason;

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject("Thông báo: HR từ chối xác nhận đơn nghỉ phép");
        message.setText(
                "Xin chào " + aName + ",\n\n" +
                        "Đơn nghỉ phép của bạn đã bị HR từ chối xác nhận.\n" +
                        "Người duyệt trước đó: " + apvName + "\n" +
                        "Lý do HR từ chối: " + rsn + "\n\n" +
                        "Vui lòng liên hệ phòng Nhân sự để biết thêm chi tiết.\n\n" +
                        "Trân trọng!"
        );
        mailSender.send(message);
    }

    @Async
    public void sendHrRejectEmailToApproverAsync(
            String toEmail,
            String approverName,
            String applicantName,
            String reason
    ) {
        sendHrRejectEmailToApprover(toEmail, approverName, applicantName, reason);
    }

    public void sendHrRejectEmailToApprover(
            String toEmail,
            String approverName,
            String applicantName,
            String reason
    ) {
        String apvName = (approverName == null || approverName.isBlank()) ? "Anh/Chị" : approverName;
        String aName = (applicantName == null || applicantName.isBlank()) ? "Người nộp đơn" : applicantName;
        String rsn = (reason == null || reason.isBlank()) ? "Không rõ lý do" : reason;

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject("Thông báo: HR từ chối xác nhận đơn nghỉ phép");
        message.setText(
                "Xin chào " + apvName + ",\n\n" +
                        "Đơn nghỉ phép của " + aName + " mà bạn đã ký duyệt đã bị HR từ chối xác nhận.\n" +
                        "Lý do HR từ chối: " + rsn + "\n\n" +
                        "Trân trọng!"
        );
        mailSender.send(message);
    }

    // ===== Helpers cho email xin hủy đơn =====
    private String safe(String s, String fallback) {
        return (s == null || s.isBlank()) ? fallback : s;
    }

    private String buildLeaveDetail(
            LeaveType leaveType,
            LocalDate startDate,
            LocalDate endDate,
            List<LocalDate> daysOff,
            LocalTime startTime,
            LocalTime endTime
    ) {
        StringBuilder detail = new StringBuilder();
        DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");

        if (leaveType == LeaveType.FULL_DAY && daysOff != null && !daysOff.isEmpty()) {
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
            String timeRange = (leaveType == LeaveType.HALF_DAY_MORNING) ? "8:00-12:00" : "13:00-17:00";
            if (startDate != null) {
                detail.append("Ngày: ").append(startDate.format(dateFmt))
                        .append(" (").append(timeRange).append(")");
            } else {
                detail.append("Ngày: không xác định (").append(timeRange).append(")");
            }
        } else if (leaveType == LeaveType.CUSTOM_HOURS && startTime != null && endTime != null && startDate != null) {
            DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("HH:mm");
            detail.append("Ngày: ").append(startDate.format(dateFmt))
                    .append(" (").append(startTime.format(timeFmt))
                    .append(" - ").append(endTime.format(timeFmt)).append(")");
        } else {
            detail.append("Chi tiết thời gian nghỉ: không xác định!");
        }

        return detail.toString();
    }

    private String buildRequestUrl(Long requestId) {
        // FE có thể điều chỉnh path nếu bạn dùng route khác
        if (requestId == null) return client_url;
        return client_url + "/leave-requests/" + requestId;
    }

    // ========== GỬI EMAIL: NHÂN VIÊN XIN HỦY ĐƠN (GỬI NGƯỜI DUYỆT) ==========
    @Async
    public void sendCancelRequestEmailToApproverAsync(
            String toEmail,
            String approverName,
            String applicantName,
            Long requestId,
            String cancelReason,
            LeaveType leaveType,
            LocalDate startDate,
            LocalDate endDate,
            List<LocalDate> daysOff,
            LocalTime startTime,
            LocalTime endTime
    ) {
        sendCancelRequestEmailToApprover(
                toEmail,
                approverName,
                applicantName,
                requestId,
                cancelReason,
                leaveType,
                startDate,
                endDate,
                daysOff,
                startTime,
                endTime
        );
    }

    public void sendCancelRequestEmailToApprover(
            String toEmail,
            String approverName,
            String applicantName,
            Long requestId,
            String cancelReason,
            LeaveType leaveType,
            LocalDate startDate,
            LocalDate endDate,
            List<LocalDate> daysOff,
            LocalTime startTime,
            LocalTime endTime
    ) {
        String apvName = safe(approverName, "Anh/Chị");
        String aName = safe(applicantName, "Nhân viên");
        String rsn = safe(cancelReason, "Không nêu lý do");
        String detail = buildLeaveDetail(leaveType, startDate, endDate, daysOff, startTime, endTime);
        String url = buildRequestUrl(requestId);

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject("Yêu cầu hủy đơn nghỉ phép từ " + aName);

        String idLine = (requestId == null) ? "" : ("• Mã đơn: #" + requestId + "\n");

        message.setText(
                "Xin chào " + apvName + ",\n\n" +
                        aName + " vừa gửi yêu cầu HỦY đơn nghỉ phép đã nộp.\n\n" +
                        idLine +
                        "• Thời gian nghỉ: " + detail + "\n" +
                        "• Lý do hủy: " + rsn + "\n\n" +
                        "Bạn có thể xem/duyệt yêu cầu tại: " + url + "\n\n" +
                        "Trân trọng!"
        );

        mailSender.send(message);
    }

    // ========== GỬI EMAIL: NHÂN VIÊN XIN HỦY ĐƠN (GỬI HR) ==========
    @Async
    public void sendCancelRequestEmailToHrAsync(
            String toEmail,
            String hrName,
            String approverName,
            String applicantName,
            Long requestId,
            String cancelReason,
            LeaveType leaveType,
            LocalDate startDate,
            LocalDate endDate,
            List<LocalDate> daysOff,
            LocalTime startTime,
            LocalTime endTime
    ) {
        sendCancelRequestEmailToHr(
                toEmail,
                hrName,
                approverName,
                applicantName,
                requestId,
                cancelReason,
                leaveType,
                startDate,
                endDate,
                daysOff,
                startTime,
                endTime
        );
    }

    public void sendCancelRequestEmailToHr(
            String toEmail,
            String hrName,
            String approverName,
            String applicantName,
            Long requestId,
            String cancelReason,
            LeaveType leaveType,
            LocalDate startDate,
            LocalDate endDate,
            List<LocalDate> daysOff,
            LocalTime startTime,
            LocalTime endTime
    ) {
        String hr = safe(hrName, "Phòng Nhân sự");
        String apvName = safe(approverName, "Người duyệt");
        String aName = safe(applicantName, "Nhân viên");
        String rsn = safe(cancelReason, "Không nêu lý do");
        String detail = buildLeaveDetail(leaveType, startDate, endDate, daysOff, startTime, endTime);
        String url = buildRequestUrl(requestId);

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject("Thông báo: Yêu cầu hủy đơn nghỉ phép của " + aName);

        String idLine = (requestId == null) ? "" : ("• Mã đơn: #" + requestId + "\n");

        message.setText(
                "Xin chào " + hr + ",\n\n" +
                        aName + " đã gửi yêu cầu HỦY đơn nghỉ phép.\n" +
                        "Người duyệt trực tiếp: " + apvName + "\n\n" +
                        idLine +
                        "• Thời gian nghỉ: " + detail + "\n" +
                        "• Lý do hủy: " + rsn + "\n\n" +
                        "Chi tiết tại: " + url + "\n\n" +
                        "Trân trọng!"
        );

        mailSender.send(message);
    }

    // ========== GỬI EMAIL XÁC NHẬN: NGƯỜI DUYỆT HỦY ==========

    @Async
    public void sendCancelConfirmedByApproverToApplicantAsync(
            String toEmail,
            String applicantName,
            String approverName,
            Long requestId,
            LeaveType leaveType,
            LocalDate startDate,
            LocalDate endDate,
            List<LocalDate> daysOff,
            LocalTime startTime,
            LocalTime endTime
    ) {
        sendCancelConfirmedByApproverToApplicant(
                toEmail, applicantName, approverName, requestId,
                leaveType, startDate, endDate, daysOff, startTime, endTime
        );
    }

    public void sendCancelConfirmedByApproverToApplicant(
            String toEmail,
            String applicantName,
            String approverName,
            Long requestId,
            LeaveType leaveType,
            LocalDate startDate,
            LocalDate endDate,
            List<LocalDate> daysOff,
            LocalTime startTime,
            LocalTime endTime
    ) {
        String aName = safe(applicantName, "Anh/Chị");
        String apvName = safe(approverName, "Người duyệt");
        String detail = buildLeaveDetail(leaveType, startDate, endDate, daysOff, startTime, endTime);
        String url = buildRequestUrl(requestId);
        String idLine = (requestId == null) ? "" : ("• Mã đơn: #" + requestId + "\n");

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject("Xác nhận: Đơn nghỉ phép đã bị hủy (Người duyệt)");

        message.setText(
                "Xin chào " + aName + ",\n\n" +
                        "Đơn nghỉ phép của bạn đã được " + apvName + " hủy.\n\n" +
                        idLine +
                        "• Thời gian nghỉ: " + detail + "\n\n" +
                        "Bạn có thể xem chi tiết tại: " + url + "\n\n" +
                        "Trân trọng!"
        );

        mailSender.send(message);
    }


// ========== GỬI EMAIL XÁC NHẬN: HR HỦY ==========

    @Async
    public void sendCancelConfirmedByHrToApplicantAsync(
            String toEmail,
            String applicantName,
            String hrName,
            Long requestId,
            LeaveType leaveType,
            LocalDate startDate,
            LocalDate endDate,
            List<LocalDate> daysOff,
            LocalTime startTime,
            LocalTime endTime
    ) {
        sendCancelConfirmedByHrToApplicant(
                toEmail, applicantName, hrName, requestId,
                leaveType, startDate, endDate, daysOff, startTime, endTime
        );
    }

    public void sendCancelConfirmedByHrToApplicant(
            String toEmail,
            String applicantName,
            String hrName,
            Long requestId,
            LeaveType leaveType,
            LocalDate startDate,
            LocalDate endDate,
            List<LocalDate> daysOff,
            LocalTime startTime,
            LocalTime endTime
    ) {
        String aName = safe(applicantName, "Anh/Chị");
        String hr = safe(hrName, "Phòng Nhân sự");
        String detail = buildLeaveDetail(leaveType, startDate, endDate, daysOff, startTime, endTime);
        String url = buildRequestUrl(requestId);
        String idLine = (requestId == null) ? "" : ("• Mã đơn: #" + requestId + "\n");

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject("Xác nhận: Đơn nghỉ phép của bạn đã bị HR hủy");

        message.setText(
                "Xin chào " + aName + ",\n\n" +
                        "Đơn nghỉ phép của bạn đã được " + hr + " hủy.\n\n" +
                        idLine +
                        "• Thời gian nghỉ: " + detail + "\n\n" +
                        "Bạn có thể xem chi tiết tại: " + url + "\n\n" +
                        "Trân trọng!"
        );

        mailSender.send(message);
    }

    // ========== NHẮC NHỞ CUỐI THÁNG: ĐƠN CHƯA ĐƯỢC XỬ LÝ (GỬI NGƯỜI DUYỆT/HR) ==========

    @Async
    public void sendMonthEndPendingReminderToApproverAsync(
            String toEmail,
            String approverName,          // tên người duyệt hoặc "Phòng Nhân sự"
            String applicantName,         // tên người nộp đơn
            Long requestId,
            LeaveStatus status,           // PENDING hoặc PENDING_HR
            LeaveType leaveType,
            LocalDate startDate,
            LocalDate endDate,
            List<LocalDate> daysOff,
            LocalTime startTime,
            LocalTime endTime
    ) {
        sendMonthEndPendingReminderToApprover(
                toEmail, approverName, applicantName, requestId,
                status, leaveType, startDate, endDate, daysOff, startTime, endTime
        );
    }

    public void sendMonthEndPendingReminderToApprover(
            String toEmail,
            String approverName,
            String applicantName,
            Long requestId,
            LeaveStatus status,
            LeaveType leaveType,
            LocalDate startDate,
            LocalDate endDate,
            List<LocalDate> daysOff,
            LocalTime startTime,
            LocalTime endTime
    ) {
        String apv = safe(approverName, "Anh/Chị");
        String app = safe(applicantName, "Nhân viên");
        String url = buildRequestUrl(requestId);
        String idLine = (requestId == null) ? "" : ("• Mã đơn: #" + requestId + "\n");
        String detail = buildLeaveDetail(leaveType, startDate, endDate, daysOff, startTime, endTime);

        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setTo(toEmail);
        msg.setSubject("Nhắc nhở: Sắp hết tháng, đơn nghỉ phép chưa được xử lý");

        msg.setText(
                "Xin chào " + apv + ",\n\n" +
                        "Đơn nghỉ phép của " + app + " vẫn đang ở trạng thái " + status + ".\n" +
                        idLine +
                        "• Thời gian nghỉ: " + detail + "\n\n" +
                        "Tháng sẽ kết thúc trong 2 ngày nữa. Vui lòng xử lý sớm tại: " + url + "\n\n" +
                        "Trân trọng!"
        );
        mailSender.send(msg);
    }

// ========== NHẮC NHỞ CUỐI THÁNG: GỬI NGƯỜI NỘP ĐƠN (SENDER) ==========

    @Async
    public void sendMonthEndPendingReminderToApplicantAsync(
            String toEmail,
            String applicantName,
            String approverNameOrDept,    // tên người duyệt hoặc "Phòng Nhân sự"
            Long requestId,
            LeaveStatus status,           // PENDING hoặc PENDING_HR
            LeaveType leaveType,
            LocalDate startDate,
            LocalDate endDate,
            List<LocalDate> daysOff,
            LocalTime startTime,
            LocalTime endTime
    ) {
        sendMonthEndPendingReminderToApplicant(
                toEmail, applicantName, approverNameOrDept, requestId,
                status, leaveType, startDate, endDate, daysOff, startTime, endTime
        );
    }

    public void sendMonthEndPendingReminderToApplicant(
            String toEmail,
            String applicantName,
            String approverNameOrDept,
            Long requestId,
            LeaveStatus status,
            LeaveType leaveType,
            LocalDate startDate,
            LocalDate endDate,
            List<LocalDate> daysOff,
            LocalTime startTime,
            LocalTime endTime
    ) {
        String app = safe(applicantName, "Anh/Chị");
        String apv = safe(approverNameOrDept, "Bộ phận xử lý");
        String url = buildRequestUrl(requestId);
        String idLine = (requestId == null) ? "" : ("• Mã đơn: #" + requestId + "\n");
        String detail = buildLeaveDetail(leaveType, startDate, endDate, daysOff, startTime, endTime);

        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setTo(toEmail);
        msg.setSubject("Nhắc nhở: Đơn nghỉ phép của bạn chưa được xử lý (sắp hết tháng)");

        msg.setText(
                "Xin chào " + app + ",\n\n" +
                        "Đơn nghỉ phép của bạn vẫn đang ở trạng thái " + status + ".\n" +
                        idLine +
                        "• Thời gian nghỉ: " + detail + "\n\n" +
                        "Tháng sẽ kết thúc trong 2 ngày nữa. Bạn vui lòng theo dõi và liên hệ \"" + apv + "\" nếu cần.\n" +
                        "Xem chi tiết: " + url + "\n\n" +
                        "Trân trọng!"
        );
        mailSender.send(msg);
    }
    public void sendSalarySlipEmail(String toEmail,
                                   String employeeName,
                                   byte[] pdf,
                                   int year,
                                   int month,
                                   String fileName) throws MessagingException {

        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true);

        helper.setTo(toEmail);
        helper.setSubject("Salary Slip for " + month + "/" + year);
        helper.setText("Dear " + employeeName + ",\n\n"
                + "Your salary slip for " + month + "/" + year + " has been approved and attached.\n\n"
                + "Best regards,\nAccounting Department");

        helper.addAttachment(fileName, new ByteArrayResource(pdf));

        mailSender.send(message);
    }

    @Async
    public void sendCashAdvanceApprovedEmail(
            String toEmail,
            String employeeName,
            byte[] attachment,
            String fileName
    ) throws MessagingException, UnsupportedEncodingException {

        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        // Thymeleaf context
        Context context = new Context();
        context.setVariable("employeeName", employeeName);
        context.setVariable("paymentUrl", "http://localhost:3000/payment-request");

        String htmlContent = templateEngine.process("email/cash-advance-approved.html", context);

        helper.setFrom(new InternetAddress("no-reply@example.com", app_name));
        helper.setTo(toEmail);
        helper.setSubject("Notification: Your cash advance request has been approved by the Director");
        helper.setText(htmlContent, true);

        if (attachment != null && fileName != null) {
            helper.addAttachment(fileName, new ByteArrayResource(attachment));
        }

        mailSender.send(message);
    }

}
