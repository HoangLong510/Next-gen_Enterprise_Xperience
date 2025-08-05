package server.services.accountant.salary;

    public interface MailService {
        void sendMail(String to, String subject, String content);
    }

