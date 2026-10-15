package com.example.OrderService.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;

@Service
public class JWTService {

    @Value("${jwt.secret}")
    private String secretKey;

    private SecretKey getSigningKey() {

        byte[] keyBytes =
                Decoders.BASE64.decode(secretKey);

        return Keys.hmacShaKeyFor(keyBytes);
    }

    public Claims extractAllClaims(String token) {

        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public String extractUsername(String token) {

        return extractAllClaims(token)
                .getSubject();
    }

    public Long extractCompanyId(String token) {

        Object companyId =
                extractAllClaims(token).get("companyId");

        if (companyId == null) {
            return null;
        }

        if (companyId instanceof Number) {
            return ((Number) companyId).longValue();
        }

        try {
            return Long.parseLong(companyId.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    public Long extractUserId(String token) {

        Object userId =
                extractAllClaims(token).get("userId");

        if (userId == null) {
            return null;
        }

        if (userId instanceof Number) {
            return ((Number) userId).longValue();
        }

        try {
            return Long.parseLong(userId.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    public String extractRole(String token) {

        return extractAllClaims(token)
                .get("role", String.class);
    }

    public boolean isTokenValid(String token) {

        try {

            Claims claims = extractAllClaims(token);

            if (claims.getSubject() == null) {
                return false;
            }

            if (extractCompanyId(token) == null) {
                return false;
            }

            if (extractUserId(token) == null) {
                return false;
            }

            return true;

        } catch (Exception e) {

            return false;
        }
    }
}
