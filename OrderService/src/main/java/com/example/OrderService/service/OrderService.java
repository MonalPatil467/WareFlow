package com.example.OrderService.service;

import com.example.OrderService.dto.request.CreateOrderRequest;
import com.example.OrderService.dto.request.UpdateOrderStatusRequest;
import com.example.OrderService.dto.response.OrderResponse;

import java.util.List;

public interface OrderService {

    OrderResponse createOrder(CreateOrderRequest request);

    OrderResponse getOrderById(Long id);

    List<OrderResponse> getAllOrders();

    List<OrderResponse> getMyOrders();

    OrderResponse updateOrderStatus(
            Long id,
            UpdateOrderStatusRequest request
    );

    void cancelOrder(Long id);
}