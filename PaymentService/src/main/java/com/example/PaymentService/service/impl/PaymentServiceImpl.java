package com.example.PaymentService.service.impl;

import com.example.PaymentService.client.OrderClient;
import com.example.PaymentService.dto.order.OrderResponse;
import com.example.PaymentService.dto.request.CreatePaymentRequest;
import com.example.PaymentService.dto.request.UpdatePaymentStatusRequest;
import com.example.PaymentService.dto.response.PaymentResponse;
import com.example.PaymentService.entity.Payment;
import com.example.PaymentService.entity.PaymentStatus;
import com.example.PaymentService.exception.BadRequestException;
import com.example.PaymentService.exception.ResourceAlreadyExistsException;
import com.example.PaymentService.exception.ResourceNotFoundException;
import com.example.PaymentService.repository.PaymentRepository;
import com.example.PaymentService.security.TenantContext;
import com.example.PaymentService.security.UserContext;
import com.example.PaymentService.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PaymentServiceImpl implements PaymentService {

    private final PaymentRepository paymentRepository;
    private final OrderClient orderClient;

    @Override
    public PaymentResponse createPayment(
            CreatePaymentRequest request) {

        if (request == null || request.getOrderId() == null) {
            throw new BadRequestException(
                    "Order ID is required."
            );
        }

        Long companyId = getCompanyId();
        Long userId = getUserId();

        if (paymentRepository.existsByOrderIdAndCompanyId(
                request.getOrderId(),
                companyId)) {

            throw new ResourceAlreadyExistsException(
                    "Payment already exists for order : "
                            + request.getOrderId()
            );
        }

        OrderResponse order;

        try {
            order = orderClient.getOrderById(
                    request.getOrderId()
            );
        } catch (Exception e) {
            throw new ResourceNotFoundException(
                    "Order with id "
                            + request.getOrderId()
                            + " not found."
            );
        }

        if (order == null) {
            throw new ResourceNotFoundException(
                    "Order with id "
                            + request.getOrderId()
                            + " not found."
            );
        }

        if (order.getCompanyId() == null
                || !order.getCompanyId().equals(companyId)) {

            throw new BadRequestException(
                    "Order does not belong to this company."
            );
        }

        if (order.getUserId() == null
                || !order.getUserId().equals(userId)) {

            throw new BadRequestException(
                    "Order does not belong to this user."
            );
        }

        if (order.getTotalAmount() == null) {
            throw new BadRequestException(
                    "Order amount is not available."
            );
        }

        Payment payment = Payment.builder()
                .orderId(order.getId())
                .userId(order.getUserId())
                .companyId(order.getCompanyId())
                .amount(order.getTotalAmount())
                .paymentStatus(PaymentStatus.PENDING)
                .build();

        Payment savedPayment =
                paymentRepository.save(payment);

        return mapToResponse(savedPayment);
    }
    @Override
    public List<PaymentResponse> getMyPayments() {

        Long companyId = getCompanyId();
        Long userId = getUserId();

        return paymentRepository
                .findByUserIdAndCompanyId(userId, companyId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }
    @Override
    public PaymentResponse getPaymentById(Long id) {

        validateId(id);

        Long companyId = getCompanyId();

        Payment payment =
                paymentRepository
                        .findByIdAndCompanyId(id, companyId)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Payment with id "
                                                + id
                                                + " not found."
                                ));

        return mapToResponse(payment);
    }

    @Override
    public PaymentResponse getPaymentByOrderId(
            Long orderId) {

        validateId(orderId);

        Long companyId = getCompanyId();

        Payment payment =
                paymentRepository
                        .findByOrderIdAndCompanyId(
                                orderId,
                                companyId
                        )
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Payment for order "
                                                + orderId
                                                + " not found."
                                ));

        return mapToResponse(payment);
    }

    @Override
    public List<PaymentResponse> getAllPayments() {

        Long companyId = getCompanyId();

        return paymentRepository
                .findByCompanyId(companyId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    public PaymentResponse updatePaymentStatus(
            Long id,
            UpdatePaymentStatusRequest request) {

        validateId(id);

        if (request == null
                || request.getPaymentStatus() == null) {

            throw new BadRequestException(
                    "Payment status is required."
            );
        }

        Long companyId = getCompanyId();

        Payment payment =
                paymentRepository
                        .findByIdAndCompanyId(
                                id,
                                companyId
                        )
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Payment with id "
                                                + id
                                                + " not found."
                                ));

        payment.setPaymentStatus(
                request.getPaymentStatus()
        );

        Payment updatedPayment =
                paymentRepository.save(payment);

        return mapToResponse(updatedPayment);
    }

    private Long getCompanyId() {

        Long companyId =
                TenantContext.getCompanyId();

        if (companyId == null) {
            throw new BadRequestException(
                    "Company not found in JWT."
            );
        }

        return companyId;
    }

    private Long getUserId() {

        Long userId =
                UserContext.getUserId();

        if (userId == null) {
            throw new BadRequestException(
                    "User not found in JWT."
            );
        }

        return userId;
    }

    private void validateId(Long id) {

        if (id == null || id <= 0) {
            throw new BadRequestException(
                    "Invalid payment id."
            );
        }
    }

    private PaymentResponse mapToResponse(
            Payment payment) {

        return PaymentResponse.builder()
                .id(payment.getId())
                .orderId(payment.getOrderId())
                .userId(payment.getUserId())
                .companyId(payment.getCompanyId())
                .amount(payment.getAmount())
                .paymentStatus(payment.getPaymentStatus())
                .createdAt(payment.getCreatedAt())
                .updatedAt(payment.getUpdatedAt())
                .build();
    }
}