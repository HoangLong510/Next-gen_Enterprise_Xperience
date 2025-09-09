package server.services;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;
import server.models.enums.LeaveType;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
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
        message.setSubject("Thông báo từ chối đơn nghỉ phép");
        message.setText("Xin chào " + applicantName + ",\n\n" +
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
        message.setSubject("Đơn nghỉ phép đã được duyệt");

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
}
