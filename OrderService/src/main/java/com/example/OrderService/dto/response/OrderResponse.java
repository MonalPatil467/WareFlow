package com.example.OrderService.dto.response;

import com.example.OrderService.entity.OrderStatus;
import com.example.OrderService.entity.PaymentStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderResponse {

    private Long id;

    private Long userId;

    private Long companyId;

    private OrderStatus orderStatus;

    private PaymentStatus paymentStatus;

    private BigDecimal totalAmount;

    private String shippingAddress;

    private String city;

    private String state;

    private String country;

    private String postalCode;

    private List<OrderItemResponse> items;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}