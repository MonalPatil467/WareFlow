
package com.example.OrderService.client;

import com.example.OrderService.config.FeignConfig;
import com.example.OrderService.dto.product.ProductResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(
        name = "inventoryService",
        contextId = "productClient",
        configuration = FeignConfig.class
)
public interface ProductClient {

    @GetMapping("/api/products/{id}")
    ProductResponse getProductById(@PathVariable("id") Long id);
}