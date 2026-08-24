package com.example.inventoryService.repository;

import com.example.inventoryService.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CategoryRepository extends JpaRepository<Category,Long> {

    List<Category> findByCompanyId(Long companyId);

    Optional<Category> findByIdAndCompanyId(Long id, Long companyId);

    boolean existsByCategoryNameAndCompanyId(String categoryName, Long companyId);
}
