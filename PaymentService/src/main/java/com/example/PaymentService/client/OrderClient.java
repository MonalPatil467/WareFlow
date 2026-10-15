package com.example.PaymentService.client;

import com.example.PaymentService.dto.order.OrderResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(
        name = "orderService",
        url = "${order.service.url}"
)
public interface OrderClient {

    @GetMapping("/api/orders/{id}")
    OrderResponse getOrderById(
            @PathVariable("id") Long id
    );
}