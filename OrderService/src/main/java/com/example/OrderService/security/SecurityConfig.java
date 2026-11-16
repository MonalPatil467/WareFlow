package com.example.OrderService.security;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    private final JWTAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http) throws Exception {

        http
                .csrf(csrf -> csrf.disable())

                .sessionManagement(session ->
                        session.sessionCreationPolicy(
                                SessionCreationPolicy.STATELESS))

                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(
                                new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))

                .authorizeHttpRequests(auth -> auth

                        .requestMatchers("/actuator/health").permitAll()


                        .requestMatchers(HttpMethod.PUT, "/api/orders/*/status")
                        .hasAnyRole("COMPANY_ADMIN", "MANAGER")
                        .requestMatchers(HttpMethod.PUT, "/api/orders/*/payment-status")
                        .hasAnyRole("COMPANY_ADMIN", "MANAGER")


                        .requestMatchers(HttpMethod.GET, "/api/orders")
                        .hasAnyRole("COMPANY_ADMIN", "MANAGER")


                        .requestMatchers("/api/orders/**", "/api/orders")
                        .hasAnyRole("COMPANY_ADMIN", "MANAGER", "WORKER")

                        .anyRequest().denyAll()
                )

                .addFilterBefore(jwtAuthenticationFilter,
                        UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}