package com.example.companyservice.security;

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

        byte[] key =
                Decoders.BASE64.decode(secretKey);

        return Keys.hmacShaKeyFor(key);
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
                extractAllClaims(token)
                        .get("companyId");

        if (companyId == null) {
            return null;
        }

        if (companyId instanceof Integer) {
            return ((Integer) companyId).longValue();
        }

        if (companyId instanceof Long) {
            return (Long) companyId;
        }

        return Long.parseLong(
                companyId.toString()
        );
    }

    public String extractRole(String token) {

        return extractAllClaims(token)
                .get("role", String.class);
    }

    public boolean isTokenValid(String token) {

        try {

            extractAllClaims(token);

            return true;

        } catch (Exception e) {

            return false;
        }
    }
}