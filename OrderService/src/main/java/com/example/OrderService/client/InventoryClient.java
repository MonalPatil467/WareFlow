
package com.example.OrderService.client;

import com.example.OrderService.config.FeignConfig;
import com.example.OrderService.dto.inventory.InventoryResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(
        name = "inventoryService",
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
}