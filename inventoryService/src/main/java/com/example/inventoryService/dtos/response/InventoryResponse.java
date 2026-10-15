package com.example.inventoryService.dtos.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class InventoryResponse {

    private Long id;

    private Long productId;

    private String productName;

    private String sku;

    private Integer quantity;

    private Integer reorderLevel;

    private Integer maximumStock;

    private Long warehouseId;

    private String warehouseName;

    private boolean active;
}