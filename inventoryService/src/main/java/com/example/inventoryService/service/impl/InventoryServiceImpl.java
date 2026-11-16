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
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class InventoryServiceImpl implements InventoryService {

    private final WarehouseRepository warehouseRepository;
    private final InventoryRepository inventoryRepository;
    private final ProductRepository productRepository;

    @Override
    @Transactional
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

        if (request.getQuantity() > request.getMaximumStock()) {
            throw new BadRequestException(
                    "Quantity cannot exceed maximum stock.");
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
    @Transactional
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

        if (request.getQuantity() > request.getMaximumStock()) {
            throw new BadRequestException(
                    "Quantity cannot exceed maximum stock.");
        }

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

        List<Inventory> rows = inventoryRepository
                .findByProduct_IdAndCompanyId(productId, companyId)
                .stream()
                .filter(Inventory::isActive)
                .toList();

        if (rows.isEmpty()) {
            throw new ResourceNotFoundException(
                    "Inventory not found for product id : "
                            + productId);
        }

        // Product may sit in several warehouses: return the first row
        // with the quantity summed across all of them.
        InventoryResponse response = mapToResponse(rows.get(0));
        response.setQuantity(
                rows.stream().mapToInt(Inventory::getQuantity).sum());

        return response;
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
    @Transactional
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

    @Override
    @Transactional
    public void deductStock(Long productId, int quantity) {

        Long companyId = requireCompany();

        if (productId == null || productId <= 0 || quantity <= 0) {
            throw new BadRequestException("Invalid stock request.");
        }

        List<Inventory> rows =
                inventoryRepository.findActiveForUpdate(productId, companyId);

        int available = rows.stream().mapToInt(Inventory::getQuantity).sum();

        if (rows.isEmpty() || available < quantity) {
            throw new BadRequestException(
                    "Insufficient stock for product id " + productId
                            + ". Available: " + available
                            + ", requested: " + quantity);
        }

        int remaining = quantity;

        for (Inventory row : rows) {

            if (remaining == 0) {
                break;
            }

            int take = Math.min(row.getQuantity(), remaining);
            row.setQuantity(row.getQuantity() - take);
            remaining -= take;
        }

        inventoryRepository.saveAll(rows);
    }

    @Override
    @Transactional
    public void restoreStock(Long productId, int quantity) {

        Long companyId = requireCompany();

        if (productId == null || productId <= 0 || quantity <= 0) {
            throw new BadRequestException("Invalid stock request.");
        }

        List<Inventory> rows =
                inventoryRepository.findActiveForUpdate(productId, companyId);

        if (rows.isEmpty()) {
            throw new ResourceNotFoundException(
                    "Inventory not found for product id : " + productId);
        }

        // Put stock back into the first warehouse row. (Order items do not
        // record which warehouse the stock came from.)
        Inventory target = rows.get(0);
        target.setQuantity(target.getQuantity() + quantity);

        inventoryRepository.save(target);
    }

    private Long requireCompany() {

        Long companyId = TenantContext.getCompanyId();

        if (companyId == null) {
            throw new BadRequestException("Company not found in JWT.");
        }

        return companyId;
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