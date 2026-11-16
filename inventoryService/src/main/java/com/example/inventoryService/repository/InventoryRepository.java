package com.example.inventoryService.repository;

import com.example.inventoryService.entity.Inventory;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface InventoryRepository
        extends JpaRepository<Inventory, Long> {

    List<Inventory> findByCompanyId(Long companyId);

    Optional<Inventory> findByIdAndCompanyId(
            Long id,
            Long companyId);


    List<Inventory> findByProduct_IdAndCompanyId(
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


    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from Inventory i "
            + "where i.product.id = :productId "
            + "and i.companyId = :companyId "
            + "and i.active = true "
            + "order by i.id")
    List<Inventory> findActiveForUpdate(
            @Param("productId") Long productId,
            @Param("companyId") Long companyId);
}