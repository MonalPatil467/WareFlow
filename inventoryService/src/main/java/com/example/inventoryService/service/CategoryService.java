package com.example.inventoryService.service;

import com.example.inventoryService.dtos.request.CreateCategoryRequest;
import com.example.inventoryService.dtos.request.UpdateCategoryRequest;
import com.example.inventoryService.dtos.response.CategoryResponse;
import com.example.inventoryService.exception.ResourceAlreadyExistsException;

import java.util.List;

public interface CategoryService {
    CategoryResponse createCategory(CreateCategoryRequest request) throws ResourceAlreadyExistsException;

    CategoryResponse updateCategory(Long id, UpdateCategoryRequest request);



    CategoryResponse getCategoryById(Long id);

    List<CategoryResponse> getAllCategories();

    void deleteCategory(Long id);
}
