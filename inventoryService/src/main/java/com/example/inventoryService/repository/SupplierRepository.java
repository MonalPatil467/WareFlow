package com.example.inventoryService.repository;

import com.example.inventoryService.entity.Supplier;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SupplierRepository extends JpaRepository<Supplier, Long> {

    List<Supplier> findByCompanyId(Long companyId);

    Optional<Supplier> findByIdAndCompanyId(Long id, Long companyId);

    boolean existsByEmailAndCompanyId(String email, Long companyId);
}
