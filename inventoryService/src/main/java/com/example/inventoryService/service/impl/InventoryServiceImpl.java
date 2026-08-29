package com.example.inventoryService.service.impl;

import com.example.inventoryService.dtos.request.CreateInventoryRequest;
import com.example.inventoryService.dtos.request.UpdateInventoryRequest;
import com.example.inventoryService.dtos.response.InventoryResponse;
import com.example.inventoryService.entity.Inventory;
import com.example.inventoryService.entity.Product;
import com.example.inventoryService.entity.Warehouse;
import com.example.inventoryService.exception.BadRequestException;
import com.example.inventoryService.exception.ResourceAlreadyExistsException;
import com.example.inventoryService.exception.ResourceNotFoundException;
import com.example.inventoryService.repository.InventoryRepository;
import com.example.inventoryService.repository.ProductRepository;
import com.example.inventoryService.repository.WarehouseRepository;
import com.example.inventoryService.security.TenantContext;
import com.example.inventoryService.service.InventoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class InventoryServiceImpl implements InventoryService {

    private final WarehouseRepository warehouseRepository;
    private final InventoryRepository inventoryRepository;
    private final ProductRepository productRepository;

    @Override
    public InventoryResponse createInventory(CreateInventoryRequest request) {

        Long companyId = TenantContext.getCompanyId();

        if (companyId == null) {
            throw new BadRequestException("Company not found in JWT.");
        }

        if (request == null) {
            throw new BadRequestException("Inventory request cannot be null.");
        }

        Product product = productRepository
                .findByIdAndCompanyId(
                        request.getProductId(),
                        companyId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Product not found with id : "
                                        + request.getProductId()));

        if (!product.isActive()) {
            throw new BadRequestException(
                    "Cannot create inventory for an inactive product.");
        }

        Warehouse warehouse = warehouseRepository
                .findByIdAndCompanyId(
                        request.getWarehouseId(),
                        companyId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Warehouse not found with id : "
                                        + request.getWarehouseId()));

        if (!warehouse.isActive()) {
            throw new BadRequestException(
                    "Cannot add inventory to an inactive warehouse.");
        }

        if (inventoryRepository
                .existsByProduct_IdAndWarehouse_IdAndCompanyId(
                        request.getProductId(),
                        request.getWarehouseId(),
                        companyId)) {

            throw new ResourceAlreadyExistsException(
                    "Inventory already exists for product '"
                            + product.getProductName()
                            + "' in warehouse '"
                            + warehouse.getWarehouseName()
                            + "'.");
        }

        Inventory inventory = Inventory.builder()
                .product(product)
                .warehouse(warehouse)
                .quantity(request.getQuantity())
                .reorderLevel(request.getReorderLevel())
                .maximumStock(request.getMaximumStock())
                .companyId(companyId)
                .active(true)
                .build();

        Inventory savedInventory =
                inventoryRepository.save(inventory);

        return mapToResponse(savedInventory);
    }

    @Override
    public InventoryResponse updateInventory(
            Long id,
            UpdateInventoryRequest request) {

        Long companyId = TenantContext.getCompanyId();

        if (companyId == null) {
            throw new BadRequestException(
                    "Company not found in JWT.");
        }

        if (id == null || id <= 0) {
            throw new BadRequestException(
                    "Invalid inventory id.");
        }

        if (request == null) {
            throw new BadRequestException(
                    "Inventory request cannot be null.");
        }

        Inventory inventory = inventoryRepository
                .findByIdAndCompanyId(id, companyId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Inventory not found with id : " + id));

        inventory.setQuantity(request.getQuantity());
        inventory.setReorderLevel(request.getReorderLevel());
        inventory.setMaximumStock(request.getMaximumStock());
        inventory.setActive(request.isActive());

        Inventory updatedInventory =
                inventoryRepository.save(inventory);

        return mapToResponse(updatedInventory);
    }

    @Override
    public InventoryResponse getInventoryById(Long id) {

        Long companyId = TenantContext.getCompanyId();

        if (companyId == null) {
            throw new BadRequestException("Company not found in JWT.");
        }

        if (id == null || id <= 0) {
            throw new BadRequestException("Invalid inventory id.");
        }

        Inventory inventory = inventoryRepository
                .findByIdAndCompanyId(id, companyId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Inventory not found with id : " + id));

        return mapToResponse(inventory);
    }

    @Override
    public InventoryResponse getInventoryByProductId(Long productId) {

        Long companyId = TenantContext.getCompanyId();

        if (companyId == null) {
            throw new BadRequestException(
                    "Company not found in JWT.");
        }

        if (productId == null || productId <= 0) {
            throw new BadRequestException(
                    "Invalid product id.");
        }

        Inventory inventory = inventoryRepository
                .findByProduct_IdAndCompanyId(
                        productId,
                        companyId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Inventory not found for product id : "
                                        + productId));

        if (!inventory.isActive()) {
            throw new ResourceNotFoundException(
                    "Inventory not found for product id : "
                            + productId);
        }

        return mapToResponse(inventory);
    }
    @Override
    public List<InventoryResponse> getAllInventory() {

        Long companyId = TenantContext.getCompanyId();

        if (companyId == null) {
            throw new BadRequestException("Company not found in JWT.");
        }

        return inventoryRepository.findByCompanyId(companyId)
                .stream()
                .filter(Inventory::isActive)
                .map(this::mapToResponse)
                .toList();
    }
    @Override
    public List<InventoryResponse> getLowStockProducts() {

        Long companyId = TenantContext.getCompanyId();

        if (companyId == null) {
            throw new BadRequestException("Company not found in JWT.");
        }

        return inventoryRepository.findByCompanyId(companyId)
                .stream()
                .filter(Inventory::isActive)
                .filter(inventory ->
                        inventory.getQuantity() <= inventory.getReorderLevel())
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    public void deleteInventory(Long id) {

        Long companyId = TenantContext.getCompanyId();

        if (companyId == null) {
            throw new BadRequestException("Company not found in JWT.");
        }

        if (id == null || id <= 0) {
            throw new BadRequestException("Invalid inventory id.");
        }

        Inventory inventory = inventoryRepository
                .findByIdAndCompanyId(id, companyId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Inventory not found with id : " + id));

        // Soft delete
        inventory.setActive(false);

        inventoryRepository.save(inventory);
    }

    private InventoryResponse mapToResponse(Inventory inventory) {

        Product product = inventory.getProduct();
        Warehouse warehouse = inventory.getWarehouse();

        return InventoryResponse.builder()
                .id(inventory.getId())
                .productId(product.getId())
                .productName(product.getProductName())
                .sku(product.getSku())
                .quantity(inventory.getQuantity())
                .reorderLevel(inventory.getReorderLevel())
                .maximumStock(inventory.getMaximumStock())
                .warehouseId(warehouse.getId())
                .warehouseName(warehouse.getWarehouseName())
                .active(inventory.isActive())
                .build();
    }
}
