package com.example.PaymentService.dto.order;

import lombok.*;
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateOrderPaymentRequest {

    private String paymentStatus;
}
