package com.example.OrderService.dto.inventory;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryResponse {

    private Long id;

    private Long productId;

    private String productName;

    private String sku;

    private Integer quantity;

    private Integer reorderLevel;

    private Integer maximumStock;

    private String warehouseLocation;

    private boolean active;
}