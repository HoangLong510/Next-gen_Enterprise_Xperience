package server.services;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

@Service
@RequiredArgsConstructor
public class EmailService {
    @Value("${app.client.url}")
    private String client_url;

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

            helper.setFrom("your_email@gmail.com");
            helper.setTo(toEmail);
            helper.setSubject("New account creation notification");
            helper.setText(htmlContent, true);

            mailSender.send(message);
        } catch (MessagingException e) {
            e.printStackTrace();
        }
    }
}
