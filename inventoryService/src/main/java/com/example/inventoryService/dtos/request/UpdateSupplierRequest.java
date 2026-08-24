package com.example.inventoryService.dtos.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateSupplierRequest {

    @NotBlank
    private String supplierName;

    @NotBlank
    private String contactPerson;

    @Email
    private String email;

    @NotBlank
    private String phoneNumber;

    private String address;
    private String city;
    private String state;
    private String country;
    private String postalCode;

    private boolean active;
}
