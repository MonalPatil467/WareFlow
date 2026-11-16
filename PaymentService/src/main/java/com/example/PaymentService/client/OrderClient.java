package com.example.PaymentService.client;

import com.example.PaymentService.config.FeignConfig;
import com.example.PaymentService.dto.order.OrderResponse;
import com.example.PaymentService.dto.order.UpdateOrderPaymentRequest;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;


@FeignClient(
        name = "orderService",
        configuration = FeignConfig.class
)
public interface OrderClient {

    @GetMapping("/api/orders/{id}")
    OrderResponse getOrderById(
            @PathVariable("id") Long id
    );

    @PutMapping("/api/orders/{id}/payment-status")
    OrderResponse updatePaymentStatus(
            @PathVariable("id") Long id,
            @RequestBody UpdateOrderPaymentRequest request
    );
}