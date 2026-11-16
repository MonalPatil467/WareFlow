package com.example.PaymentService.dto.request;

import com.example.PaymentService.entity.PaymentMethod;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreatePaymentRequest {

    @NotNull(message = "Order ID is required")
    private Long orderId;


    private PaymentMethod paymentMethod;
}