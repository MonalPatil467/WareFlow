package com.example.OrderService.client;

import com.example.OrderService.config.FeignConfig;
import com.example.OrderService.dto.inventory.InventoryResponse;
import com.example.OrderService.dto.request.StockAdjustRequest;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(
        name = "inventoryService",
        contextId = "inventoryClient",
        configuration = FeignConfig.class
)
public interface InventoryClient {

    @GetMapping("/api/inventory/{id}")
    InventoryResponse getInventoryById(
            @PathVariable("id") Long id
    );

    @GetMapping("/api/inventory/product/{productId}")
    InventoryResponse getInventoryByProductId(
            @PathVariable("productId") Long productId
    );

    @PostMapping("/api/inventory/product/{productId}/deduct")
    void deductStock(
            @PathVariable("productId") Long productId,
            @RequestBody StockAdjustRequest request
    );

    @PostMapping("/api/inventory/product/{productId}/restore")
    void restoreStock(
            @PathVariable("productId") Long productId,
            @RequestBody StockAdjustRequest request
    );
}