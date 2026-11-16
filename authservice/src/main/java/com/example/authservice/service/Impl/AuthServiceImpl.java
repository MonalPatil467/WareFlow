package com.example.authservice.service.Impl;

import com.example.authservice.Exception.UserAlreadyExistsException;
import com.example.authservice.dto.request.LoginRequest;
import com.example.authservice.dto.request.RegisterRequest;
import com.example.authservice.dto.response.AuthResponse;
import com.example.authservice.entity.Role;
import com.example.authservice.entity.User;
import com.example.authservice.repository.UserRepository;
import com.example.authservice.security.JwtService;
import com.example.authservice.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    @Override
    public AuthResponse register(RegisterRequest request) {

        User caller = currentUser();

        Role targetRole = request.getRole();
        Long companyId;

        if (caller.getRole() == Role.SUPER_ADMIN) {

            if (targetRole == Role.SUPER_ADMIN) {
                throw new AccessDeniedException(
                        "SUPER_ADMIN accounts cannot be created through the API.");
            }

            if (request.getCompanyId() == null || request.getCompanyId() <= 0) {
                throw new AccessDeniedException("A valid companyId is required.");
            }

            companyId = request.getCompanyId();

        } else if (caller.getRole() == Role.COMPANY_ADMIN) {

            if (targetRole != Role.MANAGER && targetRole != Role.WORKER) {
                throw new AccessDeniedException(
                        "Company admins can only create MANAGER or WORKER users.");
            }

            companyId = caller.getCompanyId();

        } else {
            throw new AccessDeniedException("You are not allowed to create users.");
        }

        String email = request.getEmail().trim().toLowerCase();

        if (userRepository.existsByEmail(email)) {
            throw new UserAlreadyExistsException("Email already exists");
        }

        User user = User.builder()
                .firstName(request.getFirstName().trim())
                .lastName(request.getLastName().trim())
                .email(email)
                .password(passwordEncoder.encode(request.getPassword()))
                .role(targetRole)
                .companyId(companyId)
                .enabled(true)
                .build();

        userRepository.save(user);


        return AuthResponse.builder()
                .message("User Registered Successfully")
                .user(toUserInfo(user))
                .build();
    }

    @Override
    public AuthResponse login(LoginRequest request) {

        String email = request.getEmail().trim().toLowerCase();

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        email,
                        request.getPassword()
                )
        );

        User user = userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new org.springframework.security.authentication
                                .BadCredentialsException("Invalid credentials"));

        return AuthResponse.builder()
                .token(jwtService.generateToken(user))
                .message("Login Successful")
                .user(toUserInfo(user))
                .build();
    }

    private User currentUser() {

        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null
                || !(authentication.getPrincipal() instanceof User user)) {
            throw new AccessDeniedException("Authentication required.");
        }

        return user;
    }

    private AuthResponse.UserInfo toUserInfo(User user) {

        return AuthResponse.UserInfo.builder()
                .id(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .role(user.getRole().name())
                .companyId(user.getCompanyId())
                .build();
    }
}