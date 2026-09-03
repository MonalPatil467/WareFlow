package com.example.PaymentService.service;

import com.example.PaymentService.dto.request.CreatePaymentRequest;
import com.example.PaymentService.dto.request.UpdatePaymentStatusRequest;
import com.example.PaymentService.dto.response.PaymentResponse;

import java.util.List;

public interface PaymentService {

    PaymentResponse createPayment(CreatePaymentRequest request);

    PaymentResponse getPaymentById(Long id);

    PaymentResponse getPaymentByOrderId(Long orderId);

    List<PaymentResponse> getMyPayments();

    List<PaymentResponse> getAllPayments();

    PaymentResponse updatePaymentStatus(
            Long id,
            UpdatePaymentStatusRequest request);
}