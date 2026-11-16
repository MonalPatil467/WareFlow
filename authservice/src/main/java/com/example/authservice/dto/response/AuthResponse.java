package com.example.authservice.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthResponse {

    private String token;

    private String message;

    private UserInfo user;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UserInfo {

        private Long id;

        private String firstName;

        private String lastName;

        private String email;

        private String role;

        private Long companyId;
    }
}