package com.example.inventoryService.dtos.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateInventoryRequest {

    @NotNull
    private Long productId;

    @NotNull
    private Long warehouseId;

    @NotNull
    @Min(0)
    private Integer quantity;

    @NotNull
    @Min(0)
    private Integer reorderLevel;

    @NotNull
    @Min(0)
    private Integer maximumStock;
}