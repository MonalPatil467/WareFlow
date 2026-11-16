package com.example.OrderService.repository;



import com.example.OrderService.entity.Order;
import com.example.OrderService.entity.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OrderRepository
        extends JpaRepository<Order, Long> {

    Optional<Order> findByIdAndCompanyId(
            Long id,
            Long companyId
    );

    List<Order> findByCompanyId(
            Long companyId
    );

    List<Order> findByCompanyIdAndOrderStatus(
            Long companyId,
            OrderStatus orderStatus
    );

    List<Order> findByUserIdAndCompanyId(
            Long userId,
            Long companyId
    );
}
