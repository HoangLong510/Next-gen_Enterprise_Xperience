package server.configs;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.logout.LogoutHandler;
import server.models.Token;
import server.repositories.TokenRepository;

import java.io.IOException;

@Configuration
@RequiredArgsConstructor
public class CustomLogoutHandler implements LogoutHandler {
    private final TokenRepository tokenRepository;

    @Override
    public void logout(HttpServletRequest request,
                       HttpServletResponse response,
                       Authentication authentication) {
        String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            sendErrorResponse(response);
            return;
        }

        String token = authHeader.substring(7);
        Token storedToken = tokenRepository.findByAccessToken(token).orElse(null);

        if (storedToken == null) {
            sendErrorResponse(response);
            return;
        }

        tokenRepository.delete(storedToken);
    }

    private void sendErrorResponse(HttpServletResponse response) {
        response.setContentType("application/json");
        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        String jsonResponse = String.format("{\"status\": %d, \"message\": \"%s\"}", HttpStatus.UNAUTHORIZED.value(), "invalid-access-token");
        try {
            response.getWriter().write(jsonResponse);
            response.getWriter().flush();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}
