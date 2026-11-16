package com.example.inventoryService.security;

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
    SecurityFilterChain securityFilterChain(HttpSecurity http)
            throws Exception {

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


                        .requestMatchers(HttpMethod.POST,
                                "/api/inventory/product/*/deduct",
                                "/api/inventory/product/*/restore")
                        .hasAnyRole("COMPANY_ADMIN", "MANAGER", "WORKER")


                        .requestMatchers(HttpMethod.GET, "/api/**")
                        .hasAnyRole("COMPANY_ADMIN", "MANAGER", "WORKER")


                        .requestMatchers(HttpMethod.POST, "/api/**")
                        .hasAnyRole("COMPANY_ADMIN", "MANAGER")
                        .requestMatchers(HttpMethod.PUT, "/api/**")
                        .hasAnyRole("COMPANY_ADMIN", "MANAGER")
                        .requestMatchers(HttpMethod.DELETE, "/api/**")
                        .hasAnyRole("COMPANY_ADMIN", "MANAGER")

                        .anyRequest().denyAll()
                );

        http.addFilterBefore(
                jwtAuthenticationFilter,
                UsernamePasswordAuthenticationFilter.class
        );

        return http.build();
    }
}