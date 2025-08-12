package server.services;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.io.UnsupportedEncodingException;

@Service
@RequiredArgsConstructor
public class EmailService {
    @Value("${app.client.url}")
    private String client_url;
    @Value("${app.app-name}")
    private String app_name;

    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;

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
}
