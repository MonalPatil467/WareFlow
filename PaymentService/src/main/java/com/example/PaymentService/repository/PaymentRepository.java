package com.example.PaymentService.repository;

import com.example.PaymentService.entity.Payment;
import com.example.PaymentService.entity.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PaymentRepository
        extends JpaRepository<Payment, Long> {

    Optional<Payment> findByIdAndCompanyId(
            Long id,
            Long companyId
    );

    Optional<Payment> findByOrderIdAndCompanyId(
            Long orderId,
            Long companyId
    );

    List<Payment> findByCompanyId(
            Long companyId
    );

    List<Payment> findByCompanyIdAndPaymentStatus(
            Long companyId,
            PaymentStatus paymentStatus
    );

    List<Payment> findByUserIdAndCompanyId(
            Long userId,
            Long companyId
    );

    boolean existsByOrderIdAndCompanyId(
            Long orderId,
            Long companyId
    );

    Optional<Payment> findByTransactionId(
            String transactionId
    );
}
