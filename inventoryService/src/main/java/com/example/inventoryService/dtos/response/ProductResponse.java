package com.example.inventoryService.dtos.response;


import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class ProductResponse {


    private Long id;

    private String productName;

    private String sku;

    private String brand;

    private BigDecimal price;

    private String unit;

    private Long categoryId;

    private String categoryName;

    private Long supplierId;

    private String supplierName;

    private boolean active;
}