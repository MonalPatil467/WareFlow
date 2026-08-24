package com.example.inventoryService.dtos.request;


import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CreateProductRequest {

    @NotBlank
    private String productName;

    @NotBlank
    private String sku;

    @NotBlank
    private String brand;

    @NotNull
    private BigDecimal price;

    @NotBlank
    private String unit;

    @NotNull
    private Long categoryId;

    @NotNull
    private Long supplierId;

    @NotNull
    private Integer quantity;

    @NotNull
    private Integer reorderLevel;

    @NotNull
    private Integer maximumStock;

    @NotBlank
    private String warehouseLocation;
}
