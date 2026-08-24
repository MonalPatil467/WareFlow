package com.example.companyservice.dto.response;

import com.example.companyservice.entity.SubscriptionPlan;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompanyResponse {

    private Long id;

    private String companyName;

    private String email;

    private String phone;

    private String gstNumber;

    private String address;

    private String city;

    private String state;

    private String country;

    private String postalCode;

    private SubscriptionPlan subscriptionPlan;

    private LocalDate licenseExpiry;

    private boolean active;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}