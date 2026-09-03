package com.example.OrderService.service.impl;

import com.example.OrderService.client.InventoryClient;
import com.example.OrderService.dto.inventory.InventoryResponse;
import com.example.OrderService.dto.request.CreateOrderRequest;
import com.example.OrderService.dto.request.OrderItemRequest;
import com.example.OrderService.dto.request.UpdateOrderStatusRequest;
import com.example.OrderService.dto.response.OrderItemResponse;
import com.example.OrderService.dto.response.OrderResponse;
import com.example.OrderService.entity.Order;
import com.example.OrderService.entity.OrderItem;
import com.example.OrderService.entity.OrderStatus;
import com.example.OrderService.entity.PaymentStatus;
import com.example.OrderService.exception.BadRequestException;
import com.example.OrderService.exception.ResourceNotFoundException;
import com.example.OrderService.repository.OrderRepository;
import com.example.OrderService.security.TenantContext;
import com.example.OrderService.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements OrderService {

    private final OrderRepository orderRepository;
    private final InventoryClient inventoryClient;

    @Override
    @Transactional
    public OrderResponse createOrder(CreateOrderRequest request) {

        if (request == null) {
            throw new BadRequestException(
                    "Order request cannot be null."
            );
        }

        Long companyId = getCompanyId();
        Long userId = getUserId();

        if (request.getItems() == null
                || request.getItems().isEmpty()) {

            throw new BadRequestException(
                    "Order must contain at least one item."
            );
        }

        Order order = Order.builder()
                .userId(userId)
                .companyId(companyId)
                .orderStatus(OrderStatus.PENDING)
                .paymentStatus(PaymentStatus.PENDING)
                .shippingAddress(request.getShippingAddress())
                .city(request.getCity())
                .state(request.getState())
                .country(request.getCountry())
                .postalCode(request.getPostalCode())
                .totalAmount(BigDecimal.ZERO)
                .build();

        BigDecimal totalAmount = BigDecimal.ZERO;

        for (OrderItemRequest itemRequest : request.getItems()) {

            if (itemRequest.getProductId() == null) {
                throw new BadRequestException(
                        "Product ID cannot be null."
                );
            }

            if (itemRequest.getQuantity() == null
                    || itemRequest.getQuantity() <= 0) {

                throw new BadRequestException(
                        "Quantity must be greater than zero."
                );
            }

            InventoryResponse inventory;

            try {

                inventory = inventoryClient.getInventoryById(
                        itemRequest.getProductId()
                );

            } catch (Exception e) {

                throw new ResourceNotFoundException(
                        "Unable to find inventory for product id "
                                + itemRequest.getProductId()
                );
            }

            if (inventory == null) {
                throw new ResourceNotFoundException(
                        "Inventory not found for product id "
                                + itemRequest.getProductId()
                );
            }

            if (!inventory.isActive()) {
                throw new BadRequestException(
                        "Product is inactive."
                );
            }

            if (inventory.getQuantity()
                    < itemRequest.getQuantity()) {

                throw new BadRequestException(
                        "Insufficient stock for product '"
                                + inventory.getProductName()
                                + "'. Available: "
                                + inventory.getQuantity()
                                + ", requested: "
                                + itemRequest.getQuantity()
                );
            }

            if (inventory.getProductId() == null) {
                throw new BadRequestException(
                        "Inventory does not contain a valid product ID."
                );
            }


            throw new BadRequestException(
                    "Product price is not available from InventoryService. "
                            + "Add product price to the inventory/product response "
                            + "before creating orders."
            );
        }

        order.setTotalAmount(totalAmount);

        Order savedOrder = orderRepository.save(order);

        return mapToResponse(savedOrder);
    }

    @Override
    public OrderResponse getOrderById(Long id) {

        validateId(id);

        Long companyId = getCompanyId();

        Order order = orderRepository
                .findByIdAndCompanyId(id, companyId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Order with id " + id + " not found."
                        )
                );

        return mapToResponse(order);
    }

    @Override
    public List<OrderResponse> getAllOrders() {

        Long companyId = getCompanyId();

        return orderRepository
                .findByCompanyId(companyId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    public List<OrderResponse> getMyOrders() {

        Long companyId = getCompanyId();
        Long userId = getUserId();

        return orderRepository
                .findByUserIdAndCompanyId(userId, companyId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    public OrderResponse updateOrderStatus(
            Long id,
            UpdateOrderStatusRequest request) {

        validateId(id);

        if (request == null
                || request.getOrderStatus() == null) {

            throw new BadRequestException(
                    "Order status is required."
            );
        }

        Long companyId = getCompanyId();

        Order order = orderRepository
                .findByIdAndCompanyId(id, companyId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Order with id " + id + " not found."
                        )
                );

        order.setOrderStatus(request.getOrderStatus());

        Order updatedOrder = orderRepository.save(order);

        return mapToResponse(updatedOrder);
    }

    @Override
    public void cancelOrder(Long id) {

        validateId(id);

        Long companyId = getCompanyId();

        Order order = orderRepository
                .findByIdAndCompanyId(id, companyId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Order with id " + id + " not found."
                        )
                );

        if (order.getOrderStatus() == OrderStatus.CANCELLED) {
            throw new BadRequestException(
                    "Order is already cancelled."
            );
        }

        order.setOrderStatus(OrderStatus.CANCELLED);

        orderRepository.save(order);
    }

    private Long getCompanyId() {

        Long companyId = TenantContext.getCompanyId();

        if (companyId == null) {
            throw new BadRequestException(
                    "Company not found in JWT."
            );
        }

        return companyId;
    }

    private Long getUserId() {

        Long userId = TenantContext.getUserId();

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
                    "Invalid order id."
            );
        }
    }

    private OrderResponse mapToResponse(Order order) {

        List<OrderItemResponse> items =
                order.getItems()
                        .stream()
                        .map(this::mapItemToResponse)
                        .toList();

        return OrderResponse.builder()
                .id(order.getId())
                .userId(order.getUserId())
                .companyId(order.getCompanyId())
                .orderStatus(order.getOrderStatus())
                .paymentStatus(order.getPaymentStatus())
                .totalAmount(order.getTotalAmount())
                .shippingAddress(order.getShippingAddress())
                .city(order.getCity())
                .state(order.getState())
                .country(order.getCountry())
                .postalCode(order.getPostalCode())
                .items(items)
                .createdAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt())
                .build();
    }

    private OrderItemResponse mapItemToResponse(
            OrderItem item) {

        return OrderItemResponse.builder()
                .id(item.getId())
                .productId(item.getProductId())
                .productName(item.getProductName())
                .sku(item.getSku())
                .quantity(item.getQuantity())
                .unitPrice(item.getUnitPrice())
                .subtotal(item.getSubtotal())
                .build();
    }
}