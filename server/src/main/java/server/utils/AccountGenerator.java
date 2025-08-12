package server.utils;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import server.repositories.AccountRepository;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AccountGenerator {
    private final AccountRepository accountRepository;

    public String generatePassword() {
        return UUID.randomUUID().toString().replace("-", "");
    }

    private String generateUsername(String firstName, String lastName) {
        // Lấy chữ đầu của lastName, chuyển thành chữ thường
        StringBuilder username = new StringBuilder();
        if (lastName != null && !lastName.isEmpty()) {
            username.append(Character.toLowerCase(lastName.trim().charAt(0)));
        }
        // Tách các từ trong firstName
        String[] firstNames = firstName.trim().split("\\s+");
        for (int i = 0; i < firstNames.length; i++) {
            String word = firstNames[i];
            // Nếu là từ cuối thì lấy hết
            if (i == firstNames.length - 1) {
                username.append(word.toLowerCase());
            } else {
                username.append(Character.toLowerCase(word.charAt(0)));
            }
        }
        return username.toString();
    }

    public String generateUniqueUsername(String firstName, String lastName) {
        String baseUsername = generateUsername(firstName, lastName);
        String username = baseUsername;
        int count = 1;
        while (accountRepository.findByUsername(username).isPresent()) {
            username = baseUsername + count;
            count++;
        }
        return username;
    }
}
