package com.example.inventoryService.dtos.request;


import lombok.Data;

import java.math.BigDecimal;

@Data
public class UpdateProductRequest {


    private String productName;

    private String sku;

    private String brand;

    private BigDecimal price;

    private String unit;

    private Long categoryId;

    private Long supplierId;

    private boolean active;


}
