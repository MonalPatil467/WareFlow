package com.example.OrderService.dto.request;

import com.example.OrderService.entity.PaymentStatus;
import jakarta.validation.constraints.NotNull;
import lombok.*;


@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateOrderPaymentRequest {

    @NotNull(message = "Payment status is required")
    private PaymentStatus paymentStatus;
}