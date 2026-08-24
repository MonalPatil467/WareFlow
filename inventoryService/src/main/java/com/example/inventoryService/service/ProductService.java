package com.example.inventoryService.service;

import com.example.inventoryService.dtos.request.CreateProductRequest;
import com.example.inventoryService.dtos.request.UpdateProductRequest;
import com.example.inventoryService.dtos.response.ProductResponse;

import java.util.List;

public interface ProductService {
    ProductResponse createProduct(CreateProductRequest request);

    ProductResponse updateProduct(Long id, UpdateProductRequest request);

    ProductResponse getProductById(Long id);

    List<ProductResponse> getAllProducts();

    void deleteProduct(Long id);
}
