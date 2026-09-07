package com.example.inventoryService.repository;

import com.example.inventoryService.entity.Warehouse;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WarehouseRepository
        extends JpaRepository<Warehouse, Long> {

    List<Warehouse> findByCompanyId(Long companyId);

    Optional<Warehouse> findByIdAndCompanyId(
            Long id,
            Long companyId
    );

    boolean existsByWarehouseNameAndCompanyId(
            String warehouseName,
            Long companyId
    );
}
