package server.services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import server.dtos.RecaptchaResponseDto;

@Service
public class RecaptchaService {
    @Value("${app.recaptcha.secret}")
    private String recaptchaSecret;

    private static final String RECAPTCHA_VERIFY_URL =
            "https://www.google.com/recaptcha/api/siteverify";

    public boolean verify(String token) {
        RestTemplate restTemplate = new RestTemplate();
        String params = "?secret=" + recaptchaSecret + "&response=" + token;
        String url = RECAPTCHA_VERIFY_URL + params;
        RecaptchaResponseDto response = restTemplate.postForObject(url, null, RecaptchaResponseDto.class);
        return response != null && response.isSuccess();
    }
}
