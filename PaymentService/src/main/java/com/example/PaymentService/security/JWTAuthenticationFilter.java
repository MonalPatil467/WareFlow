package com.example.PaymentService.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
@RequiredArgsConstructor
public class JWTAuthenticationFilter
        extends OncePerRequestFilter {

    private final JWTService jwtService;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {

        try {

            String authHeader =
                    request.getHeader(SecurityConstants.AUTH_HEADER);

            if (authHeader == null
                    || !authHeader.startsWith(
                    SecurityConstants.TOKEN_PREFIX)) {

                filterChain.doFilter(request, response);
                return;
            }

            String token = authHeader.substring(
                    SecurityConstants.TOKEN_PREFIX.length()
            );

            if (!jwtService.isTokenValid(token)) {
                filterChain.doFilter(request, response);
                return;
            }

            if (SecurityContextHolder
                    .getContext()
                    .getAuthentication() == null) {

                String username =
                        jwtService.extractUsername(token);

                String role =
                        jwtService.extractRole(token);

                Long companyId =
                        jwtService.extractCompanyId(token);

                Long userId =
                        jwtService.extractUserId(token);

                if (username == null
                        || username.isBlank()
                        || role == null
                        || role.isBlank()
                        || companyId == null
                        || userId == null) {

                    filterChain.doFilter(request, response);
                    return;
                }

                TenantContext.setCompanyId(companyId);
                UserContext.setUserId(userId);

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(
                                username,
                                null,
                                List.of(
                                        new SimpleGrantedAuthority(
                                                "ROLE_" + role
                                        )
                                )
                        );

                authentication.setDetails(
                        new WebAuthenticationDetailsSource()
                                .buildDetails(request)
                );

                SecurityContextHolder
                        .getContext()
                        .setAuthentication(authentication);
            }

            filterChain.doFilter(request, response);

        } finally {

            TenantContext.clear();
            UserContext.clear();
        }
    }
}