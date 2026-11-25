package com.example.authservice.config;

import com.example.authservice.entity.Role;
import com.example.authservice.entity.User;
import com.example.authservice.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DataInitializer {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    @Bean
    CommandLineRunner seedSuperAdmin(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${wareflow.superadmin.email:}") String email,
            @Value("${wareflow.superadmin.password:}") String password) {

        return args -> {

            if (email.isBlank() || password.isBlank()) {
                return;
            }

            String normalized = email.trim().toLowerCase();

            if (userRepository.existsByEmail(normalized)) {
                return;
            }

            userRepository.save(User.builder()
                    .firstName("Super")
                    .lastName("Admin")
                    .email(normalized)
                    .password(passwordEncoder.encode(password))
                    .role(Role.SUPER_ADMIN)
                    .companyId(0L)
                    .enabled(true)
                    .build());

            log.info("Seeded SUPER_ADMIN {}", normalized);
        };
    }
}
