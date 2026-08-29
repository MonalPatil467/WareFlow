package com.example.inventoryService.repository;

import com.example.inventoryService.entity.Inventory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface InventoryRepository
        extends JpaRepository<Inventory, Long> {

    List<Inventory> findByCompanyId(Long companyId);

    Optional<Inventory> findByIdAndCompanyId(
            Long id,
            Long companyId);

    Optional<Inventory> findByProduct_IdAndCompanyId(
            Long productId,
            Long companyId);

    boolean existsByProduct_IdAndWarehouse_IdAndCompanyId(
            Long productId,
            Long warehouseId,
            Long companyId
    );

    Optional<Inventory> findByProduct_IdAndWarehouse_IdAndCompanyId(
            Long productId,
            Long warehouseId,
            Long companyId
    );

    List<Inventory> findByQuantityLessThanEqual(
            Integer quantity);
}
