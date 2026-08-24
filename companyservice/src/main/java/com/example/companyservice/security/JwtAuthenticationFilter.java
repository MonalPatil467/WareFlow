package com.example.companyservice.security;

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
public class JwtAuthenticationFilter
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
                    request.getHeader(
                            SecurityConstants.AUTH_HEADER
                    );

            if (authHeader == null ||
                    !authHeader.startsWith(
                            SecurityConstants.TOKEN_PREFIX)) {

                filterChain.doFilter(request, response);
                return;
            }

            String token =
                    authHeader.substring(
                            SecurityConstants.TOKEN_PREFIX.length()
                    );

            if (!jwtService.isTokenValid(token)) {

                filterChain.doFilter(request, response);
                return;
            }

            String username =
                    jwtService.extractUsername(token);

            String role =
                    jwtService.extractRole(token);

            Long companyId =
                    jwtService.extractCompanyId(token);

            if (username == null ||
                    role == null ||
                    companyId == null) {

                filterChain.doFilter(request, response);
                return;
            }

            TenantContext.setCompanyId(companyId);

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

            filterChain.doFilter(request, response);

        } finally {

            TenantContext.clear();

            SecurityContextHolder.clearContext();
        }
    }
}