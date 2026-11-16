package com.example.OrderService.service.impl;

import com.example.OrderService.client.InventoryClient;
import com.example.OrderService.client.ProductClient;
import com.example.OrderService.dto.inventory.StockAdjustRequest;
import com.example.OrderService.dto.product.ProductResponse;
import com.example.OrderService.dto.request.CreateOrderRequest;
import com.example.OrderService.dto.request.OrderItemRequest;
import com.example.OrderService.dto.request.UpdateOrderPaymentRequest;
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
import feign.FeignException;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements OrderService {

    private static final Logger log =
            LoggerFactory.getLogger(OrderServiceImpl.class);

    private final OrderRepository orderRepository;
    private final InventoryClient inventoryClient;
    private final ProductClient productClient;

    // ------------------------------------------------------------------
    // Create
    // ------------------------------------------------------------------

    @Override
    @Transactional
    public OrderResponse createOrder(CreateOrderRequest request) {

        if (request == null
                || request.getItems() == null
                || request.getItems().isEmpty()) {

            throw new BadRequestException(
                    "Order must contain at least one item.");
        }

        Long companyId = getCompanyId();
        Long userId = getUserId();

        // Merge duplicate product lines: [p1 x2, p1 x3] -> p1 x5
        Map<Long, Integer> wanted = new LinkedHashMap<>();

        for (OrderItemRequest item : request.getItems()) {

            if (item.getProductId() == null) {
                throw new BadRequestException("Product ID cannot be null.");
            }

            if (item.getQuantity() == null || item.getQuantity() <= 0) {
                throw new BadRequestException(
                        "Quantity must be greater than zero.");
            }

            wanted.merge(item.getProductId(), item.getQuantity(), Integer::sum);
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

        // Stock already taken from inventory; given back if anything fails.
        List<Map.Entry<Long, Integer>> reserved = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;

        try {

            for (Map.Entry<Long, Integer> line : wanted.entrySet()) {

                Long productId = line.getKey();
                Integer quantity = line.getValue();

                ProductResponse product = loadProduct(productId);

                if (!product.isActive()) {
                    throw new BadRequestException(
                            "Product '" + product.getProductName()
                                    + "' is inactive.");
                }

                if (product.getPrice() == null
                        || product.getPrice().signum() <= 0) {
                    throw new BadRequestException(
                            "Product '" + product.getProductName()
                                    + "' has no valid price.");
                }

                deductStock(productId, quantity, product.getProductName());
                reserved.add(Map.entry(productId, quantity));

                BigDecimal subtotal = product.getPrice()
                        .multiply(BigDecimal.valueOf(quantity));

                order.addItem(OrderItem.builder()
                        .productId(productId)
                        .productName(product.getProductName())
                        .sku(product.getSku())
                        .quantity(quantity)
                        .unitPrice(product.getPrice())
                        .subtotal(subtotal)
                        .build());

                total = total.add(subtotal);
            }

            order.setTotalAmount(total);

            return mapToResponse(orderRepository.saveAndFlush(order));

        } catch (RuntimeException ex) {

            restoreAll(reserved);
            throw ex;
        }
    }

    // ------------------------------------------------------------------
    // Read
    // ------------------------------------------------------------------

    @Override
    @Transactional(readOnly = true)
    public OrderResponse getOrderById(Long id) {

        validateId(id);

        Order order = findOwnOrder(id);

        // Plain workers may only see their own orders
        if (!isPrivileged() && !order.getUserId().equals(getUserId())) {
            throw new ResourceNotFoundException(
                    "Order with id " + id + " not found.");
        }

        return mapToResponse(order);
    }

    @Override
    @Transactional(readOnly = true)
    public List<OrderResponse> getAllOrders() {

        return orderRepository
                .findByCompanyId(getCompanyId())
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<OrderResponse> getMyOrders() {

        return orderRepository
                .findByUserIdAndCompanyId(getUserId(), getCompanyId())
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    // ------------------------------------------------------------------
    // Status changes
    // ------------------------------------------------------------------

    private static final Map<OrderStatus, Set<OrderStatus>> ALLOWED =
            Map.of(
                    OrderStatus.PENDING,
                    Set.of(OrderStatus.CONFIRMED, OrderStatus.CANCELLED),
                    OrderStatus.CONFIRMED,
                    Set.of(OrderStatus.PROCESSING, OrderStatus.CANCELLED),
                    OrderStatus.PROCESSING,
                    Set.of(OrderStatus.SHIPPED, OrderStatus.CANCELLED),
                    OrderStatus.SHIPPED,
                    Set.of(OrderStatus.DELIVERED),
                    OrderStatus.DELIVERED, Set.of(),
                    OrderStatus.CANCELLED, Set.of()
            );

    @Override
    @Transactional
    public OrderResponse updateOrderStatus(
            Long id,
            UpdateOrderStatusRequest request) {

        validateId(id);

        if (request == null || request.getOrderStatus() == null) {
            throw new BadRequestException("Order status is required.");
        }

        Order order = findOwnOrder(id);

        OrderStatus current = order.getOrderStatus();
        OrderStatus next = request.getOrderStatus();

        if (current == next) {
            return mapToResponse(order);
        }

        if (!ALLOWED.getOrDefault(current, Set.of()).contains(next)) {
            throw new BadRequestException(
                    "Cannot change order status from " + current
                            + " to " + next + ".");
        }

        if (next == OrderStatus.CANCELLED) {
            restoreOrderStock(order);
        }

        order.setOrderStatus(next);

        return mapToResponse(orderRepository.save(order));
    }

    @Override
    @Transactional
    public OrderResponse updatePaymentStatus(
            Long id,
            UpdateOrderPaymentRequest request) {

        validateId(id);

        Order order = findOwnOrder(id);

        order.setPaymentStatus(request.getPaymentStatus());

        // A paid order that is still PENDING moves on automatically
        if (request.getPaymentStatus() == PaymentStatus.PAID
                && order.getOrderStatus() == OrderStatus.PENDING) {
            order.setOrderStatus(OrderStatus.CONFIRMED);
        }

        return mapToResponse(orderRepository.save(order));
    }

    @Override
    @Transactional
    public void cancelOrder(Long id) {

        validateId(id);

        Order order = findOwnOrder(id);

        // Owner, or an admin / manager, may cancel
        if (!isPrivileged() && !order.getUserId().equals(getUserId())) {
            throw new BadRequestException(
                    "You can only cancel your own orders.");
        }

        if (order.getOrderStatus() == OrderStatus.CANCELLED) {
            throw new BadRequestException("Order is already cancelled.");
        }

        if (order.getOrderStatus() == OrderStatus.SHIPPED
                || order.getOrderStatus() == OrderStatus.DELIVERED) {
            throw new BadRequestException(
                    "A " + order.getOrderStatus()
                            + " order cannot be cancelled.");
        }

        restoreOrderStock(order);

        order.setOrderStatus(OrderStatus.CANCELLED);

        orderRepository.save(order);
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private ProductResponse loadProduct(Long productId) {

        try {

            ProductResponse product = productClient.getProductById(productId);

            if (product == null) {
                throw new ResourceNotFoundException(
                        "Product not found with id " + productId);
            }

            return product;

        } catch (FeignException.NotFound ex) {
            throw new ResourceNotFoundException(
                    "Product not found with id " + productId);
        } catch (FeignException ex) {
            log.error("Product lookup failed for {}", productId, ex);
            throw new BadRequestException(
                    "Product service is unavailable. Please try again.");
        }
    }

    private void deductStock(Long productId, int quantity, String name) {

        try {

            inventoryClient.deductStock(
                    productId,
                    StockAdjustRequest.builder().quantity(quantity).build());

        } catch (FeignException.BadRequest | FeignException.NotFound ex) {
            // InventoryService answers 400 when stock is short / no inventory row
            throw new BadRequestException(
                    "Insufficient stock for product '" + name
                            + "' (requested " + quantity + ").");
        } catch (FeignException ex) {
            log.error("Stock deduction failed for {}", productId, ex);
            throw new BadRequestException(
                    "Inventory service is unavailable. Please try again.");
        }
    }

    private void restoreOrderStock(Order order) {

        List<Map.Entry<Long, Integer>> items = new ArrayList<>();

        for (OrderItem item : order.getItems()) {
            items.add(Map.entry(item.getProductId(), item.getQuantity()));
        }

        restoreAll(items);
    }

    // Best effort: never hides the original error
    private void restoreAll(List<Map.Entry<Long, Integer>> items) {

        for (Map.Entry<Long, Integer> entry : items) {

            try {

                inventoryClient.restoreStock(
                        entry.getKey(),
                        StockAdjustRequest.builder()
                                .quantity(entry.getValue())
                                .build());

            } catch (Exception e) {
                log.error("COULD NOT RESTORE STOCK product={} qty={} - fix manually",
                        entry.getKey(), entry.getValue(), e);
            }
        }
    }

    private Order findOwnOrder(Long id) {

        return orderRepository
                .findByIdAndCompanyId(id, getCompanyId())
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Order with id " + id + " not found."));
    }

    private boolean isPrivileged() {

        Authentication auth =
                SecurityContextHolder.getContext().getAuthentication();

        return auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_COMPANY_ADMIN")
                        || a.getAuthority().equals("ROLE_MANAGER"));
    }

    private Long getCompanyId() {

        Long companyId = TenantContext.getCompanyId();

        if (companyId == null) {
            throw new BadRequestException("Company not found in JWT.");
        }

        return companyId;
    }

    private Long getUserId() {

        Long userId = TenantContext.getUserId();

        if (userId == null) {
            throw new BadRequestException("User not found in JWT.");
        }

        return userId;
    }

    private void validateId(Long id) {

        if (id == null || id <= 0) {
            throw new BadRequestException("Invalid order id.");
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

    private OrderItemResponse mapItemToResponse(OrderItem item) {

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