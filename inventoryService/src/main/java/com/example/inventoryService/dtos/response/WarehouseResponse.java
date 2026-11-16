package com.example.inventoryService.dtos.response;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WarehouseResponse {

    private Long id;

    private String warehouseName;

    private String address;

    private String city;

    private String state;

    private String country;

    private String postalCode;

    private boolean active;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}