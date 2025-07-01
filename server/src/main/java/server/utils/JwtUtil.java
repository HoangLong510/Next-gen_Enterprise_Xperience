package server.utils;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import server.models.Account;
import server.repositories.TokenRepository;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.function.Function;

@Component
@RequiredArgsConstructor
public class JwtUtil {
    private final TokenRepository tokenRepository;

    @Value("${app.jwt.secret-key}")
    private String secretKey;

    @Value("${app.jwt.access-token-expiration}")
    private long accessTokenExpire;

    @Value("${app.jwt.refresh-token-expiration}")
    private long refreshTokenExpire;

    public String generateAccessToken(Account account) {
        return generateToken(account, accessTokenExpire);
    }

    public String generateRefreshToken(Account account) {
        return generateToken(account, refreshTokenExpire);
    }

    // Phương thức kiểm tra tính hợp lệ của Access Token
    public boolean isValidAccessToken(String token, UserDetails account) {
        String username = extractUsername(token);

        boolean isValid = tokenRepository.findByAccessToken(token).isPresent();

        return username.equals(account.getUsername()) && isValid && !isTokenExpired(token);
    }

    // Phương thức kiểm tra tính hợp lệ của Refresh Token
    public boolean isValidRefreshToken(String refreshToken, UserDetails account) {
        String username = extractUsername(refreshToken);

        boolean isValid = tokenRepository.findByRefreshToken(refreshToken).isPresent();

        return username.equals(account.getUsername()) && isValid && !isTokenExpired(refreshToken);
    }

    //lấy username từ token
    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    // Phương thức kiểm tra xem token có hết hạn hay chưa
    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    // Phương thức trích xuất ngày hết hạn từ token
    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    // Phương thức trích xuất một claim bất kỳ từ token
    public  <T> T extractClaim(String token, Function<Claims, T> resolver) {
        Claims claims = extractAllClaims(token);
        return resolver.apply(claims);
    }

    // Phương thức trích xuất toàn bộ claims từ token
    private Claims extractAllClaims(String token) {
        return Jwts
                .parser()
                .verifyWith(getSigninKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private SecretKey getSigninKey() {
        byte[] keyBytes = Decoders.BASE64URL.decode(secretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    private String generateToken(Account account, long expireTime) {
        String token = Jwts
                .builder()
                .subject(account.getUsername()) // Đặt "subject" là username của người dùng
                .claim("role", account.getRole()) // Thêm thông tin role của người dùng vào claims
                .issuedAt(new Date(System.currentTimeMillis())) // Thiết lập ngày phát hành token
                .expiration(new Date(System.currentTimeMillis() + expireTime)) // Thiết lập ngày hết hạn
                .signWith(getSigninKey()) // Ký token bằng khóa bí mật
                .compact(); // Hoàn tất việc xây dựng và trả về token
        return token;
    }
}
