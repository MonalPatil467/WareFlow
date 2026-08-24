package com.example.inventoryService.service.impl;

import com.example.inventoryService.dtos.request.CreateCategoryRequest;
import com.example.inventoryService.dtos.request.UpdateCategoryRequest;
import com.example.inventoryService.dtos.response.CategoryResponse;
import com.example.inventoryService.entity.Category;
import com.example.inventoryService.exception.BadRequestException;
import com.example.inventoryService.exception.ResourceAlreadyExistsException;
import com.example.inventoryService.exception.ResourceNotFoundException;
import com.example.inventoryService.repository.CategoryRepository;
import com.example.inventoryService.security.TenantContext;
import com.example.inventoryService.service.CategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoryServiceImpl implements CategoryService {

    private final CategoryRepository categoryRepository;

    @Override
    public CategoryResponse createCategory(CreateCategoryRequest request) {

        Long companyId = getCompanyId();

        if (request == null) {
            throw new BadRequestException(
                    "Category request cannot be null.");
        }

        if (request.getCategoryName() == null
                || request.getCategoryName().trim().isEmpty()) {

            throw new BadRequestException(
                    "Category name cannot be empty.");
        }

        String categoryName = request.getCategoryName().trim();


        if (categoryRepository
                .existsByCategoryNameAndCompanyId(
                        categoryName,
                        companyId)) {

            throw new ResourceAlreadyExistsException(
                    "Category '" + categoryName
                            + "' already exists.");
        }

        Category category = Category.builder()
                .categoryName(categoryName)
                .description(request.getDescription())
                .companyId(companyId)
                .active(true)
                .build();

        Category savedCategory =
                categoryRepository.save(category);

        return mapToResponse(savedCategory);
    }

    @Override
    public CategoryResponse updateCategory(
            Long id,
            UpdateCategoryRequest request) {

        Long companyId = getCompanyId();

        validateId(id);

        if (request == null) {
            throw new BadRequestException(
                    "Category request cannot be null.");
        }

        if (request.getCategoryName() == null
                || request.getCategoryName().trim().isEmpty()) {

            throw new BadRequestException(
                    "Category name cannot be empty.");
        }

        String categoryName =
                request.getCategoryName().trim();

        Category category = categoryRepository
                .findByIdAndCompanyId(id, companyId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Category with id " + id
                                        + " not found."));


        if (!category.isActive()) {
            throw new ResourceNotFoundException(
                    "Category with id " + id
                            + " not found.");
        }


        if (!category.getCategoryName()
                .equalsIgnoreCase(categoryName)
                && categoryRepository
                .existsByCategoryNameAndCompanyId(
                        categoryName,
                        companyId)) {

            throw new ResourceAlreadyExistsException(
                    "Category '" + categoryName
                            + "' already exists.");
        }

        category.setCategoryName(categoryName);
        category.setDescription(request.getDescription());
        category.setActive(request.isActive());

        Category updatedCategory =
                categoryRepository.save(category);

        return mapToResponse(updatedCategory);
    }

    @Override
    public CategoryResponse getCategoryById(Long id) {

        Long companyId = getCompanyId();

        validateId(id);

        Category category = categoryRepository
                .findByIdAndCompanyId(id, companyId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Category with id " + id
                                        + " not found."));

        /*
         * Soft-deleted categories are treated
         * as unavailable.
         */
        if (!category.isActive()) {
            throw new ResourceNotFoundException(
                    "Category with id " + id
                            + " not found.");
        }

        return mapToResponse(category);
    }

    @Override
    public List<CategoryResponse> getAllCategories() {

        Long companyId = getCompanyId();

        return categoryRepository
                .findByCompanyId(companyId)
                .stream()
                .filter(Category::isActive)
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    public void deleteCategory(Long id) {

        Long companyId = getCompanyId();

        validateId(id);

        Category category = categoryRepository
                .findByIdAndCompanyId(id, companyId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Category with id " + id
                                        + " not found."));

        if (!category.isActive()) {
            throw new ResourceNotFoundException(
                    "Category with id " + id
                            + " not found.");
        }


        category.setActive(false);

        categoryRepository.save(category);
    }


    private Long getCompanyId() {

        Long companyId = TenantContext.getCompanyId();

        if (companyId == null) {
            throw new BadRequestException(
                    "Company not found in JWT.");
        }

        return companyId;
    }

    private void validateId(Long id) {

        if (id == null || id <= 0) {
            throw new BadRequestException(
                    "Invalid category id.");
        }
    }


    private CategoryResponse mapToResponse(
            Category category) {

        return CategoryResponse.builder()
                .id(category.getId())
                .categoryName(category.getCategoryName())
                .description(category.getDescription())
                .active(category.isActive())
                .createdAt(category.getCreatedAt())
                .build();
    }
}