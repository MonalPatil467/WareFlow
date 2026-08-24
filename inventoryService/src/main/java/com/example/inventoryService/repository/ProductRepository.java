package com.example.inventoryService.repository;

import com.example.inventoryService.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product,Long> {

    List<Product> findByCompanyId(Long companyId);

    Optional<Product> findByIdAndCompanyId(Long id, Long companyId);

    boolean existsBySkuAndCompanyId(String sku, Long companyId);
}
