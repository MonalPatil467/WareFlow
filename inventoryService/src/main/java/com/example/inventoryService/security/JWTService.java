package com.example.inventoryService.security;

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

    private SecretKey getSignInKey() {

        byte[] keyBytes = Decoders.BASE64.decode(secretKey);

        return Keys.hmacShaKeyFor(keyBytes);
    }


    public Claims extractAllClaims(String token) {

        return Jwts.parser()
                .verifyWith(getSignInKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public String extractUsername(String token) {

        Claims claims = extractAllClaims(token);

        return claims.getSubject();
    }


    public Long extractCompanyId(String token) {

        Claims claims = extractAllClaims(token);

        Object companyId =
                claims.get("companyId");

        if (companyId == null) {
            return null;
        }


        if (companyId instanceof Number) {

            return ((Number) companyId).longValue();
        }

        try {

            return Long.parseLong(
                    companyId.toString());

        } catch (NumberFormatException e) {

            return null;
        }
    }


    public String extractRole(String token) {

        Claims claims = extractAllClaims(token);

        return claims.get("role", String.class);
    }


    public boolean isTokenValid(String token) {

        if (token == null || token.isBlank()) {
            return false;
        }

        try {

            Claims claims = extractAllClaims(token);


            if (claims.getSubject() == null
                    || claims.getSubject().isBlank()) {

                return false;
            }

            if (extractCompanyId(token) == null) {
                return false;
            }


            String role = extractRole(token);

            if (role == null || role.isBlank()) {
                return false;
            }

            return true;

        } catch (Exception e) {

            return false;
        }
    }
}
