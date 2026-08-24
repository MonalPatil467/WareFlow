package com.example.inventoryService.service.impl;

import com.example.inventoryService.dtos.request.CreateProductRequest;
import com.example.inventoryService.dtos.request.UpdateProductRequest;
import com.example.inventoryService.dtos.response.ProductResponse;
import com.example.inventoryService.entity.Category;
import com.example.inventoryService.entity.Product;
import com.example.inventoryService.entity.Supplier;
import com.example.inventoryService.exception.BadRequestException;
import com.example.inventoryService.exception.ResourceAlreadyExistsException;
import com.example.inventoryService.exception.ResourceNotFoundException;
import com.example.inventoryService.repository.CategoryRepository;
import com.example.inventoryService.repository.ProductRepository;
import com.example.inventoryService.repository.SupplierRepository;
import com.example.inventoryService.security.TenantContext;
import com.example.inventoryService.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductServiceImpl implements ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final SupplierRepository supplierRepository;

    @Override
    public ProductResponse createProduct(CreateProductRequest request) {

        Long companyId = TenantContext.getCompanyId();

        if (companyId == null) {
            throw new BadRequestException("Company not found in JWT.");
        }


        if (productRepository.existsBySkuAndCompanyId(
                request.getSku(), companyId)) {

            throw new ResourceAlreadyExistsException(
                    "Product with SKU '" + request.getSku()
                            + "' already exists.");
        }


        Category category = categoryRepository
                .findByIdAndCompanyId(
                        request.getCategoryId(),
                        companyId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Category not found with id : "
                                        + request.getCategoryId()));

        if (!category.isActive()) {
            throw new BadRequestException(
                    "Cannot create product with an inactive category.");
        }


        Supplier supplier = supplierRepository
                .findByIdAndCompanyId(
                        request.getSupplierId(),
                        companyId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Supplier not found with id : "
                                        + request.getSupplierId()));

        if (!supplier.isActive()) {
            throw new BadRequestException(
                    "Cannot create product with an inactive supplier.");
        }

        Product product = Product.builder()
                .productName(request.getProductName())
                .sku(request.getSku())
                .brand(request.getBrand())
                .price(request.getPrice())
                .unit(request.getUnit())
                .category(category)
                .supplier(supplier)
                .companyId(companyId)
                .active(true)
                .build();

        Product savedProduct = productRepository.save(product);

        return mapToResponse(savedProduct);
    }

    @Override
    public ProductResponse updateProduct(
            Long id,
            UpdateProductRequest request) {

        Long companyId = TenantContext.getCompanyId();

        if (companyId == null) {
            throw new BadRequestException("Company not found in JWT.");
        }

        if (id == null || id <= 0) {
            throw new BadRequestException("Invalid product id.");
        }

        Product product = productRepository
                .findByIdAndCompanyId(id, companyId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Product not found with id : " + id));


        if (!product.getSku().equalsIgnoreCase(request.getSku())
                && productRepository.existsBySkuAndCompanyId(
                request.getSku(), companyId)) {

            throw new ResourceAlreadyExistsException(
                    "Product with SKU '" + request.getSku()
                            + "' already exists.");
        }


        Category category = categoryRepository
                .findByIdAndCompanyId(
                        request.getCategoryId(),
                        companyId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Category not found with id : "
                                        + request.getCategoryId()));

        if (!category.isActive()) {
            throw new BadRequestException(
                    "Cannot assign an inactive category.");
        }


        Supplier supplier = supplierRepository
                .findByIdAndCompanyId(
                        request.getSupplierId(),
                        companyId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Supplier not found with id : "
                                        + request.getSupplierId()));

        if (!supplier.isActive()) {
            throw new BadRequestException(
                    "Cannot assign an inactive supplier.");
        }

        product.setProductName(request.getProductName());
        product.setSku(request.getSku());
        product.setBrand(request.getBrand());
        product.setPrice(request.getPrice());
        product.setUnit(request.getUnit());
        product.setCategory(category);
        product.setSupplier(supplier);
        product.setActive(request.isActive());

        Product updatedProduct = productRepository.save(product);

        return mapToResponse(updatedProduct);
    }

    @Override
    public ProductResponse getProductById(Long id) {

        Long companyId = TenantContext.getCompanyId();

        if (companyId == null) {
            throw new BadRequestException("Company not found in JWT.");
        }

        if (id == null || id <= 0) {
            throw new BadRequestException("Invalid product id.");
        }

        Product product = productRepository
                .findByIdAndCompanyId(id, companyId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Product not found with id : " + id));

        if (!product.isActive()) {
            throw new ResourceNotFoundException(
                    "Product not found with id : " + id);
        }

        return mapToResponse(product);
    }

    @Override
    public List<ProductResponse> getAllProducts() {

        Long companyId = TenantContext.getCompanyId();

        if (companyId == null) {
            throw new BadRequestException("Company not found in JWT.");
        }

        return productRepository
                .findByCompanyId(companyId)
                .stream()
                .filter(Product::isActive)
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    public void deleteProduct(Long id) {

        Long companyId = TenantContext.getCompanyId();

        if (companyId == null) {
            throw new BadRequestException("Company not found in JWT.");
        }

        if (id == null || id <= 0) {
            throw new BadRequestException("Invalid product id.");
        }

        Product product = productRepository
                .findByIdAndCompanyId(id, companyId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Product not found with id : " + id));


        product.setActive(false);

        productRepository.save(product);
    }

    private ProductResponse mapToResponse(Product product) {

        return ProductResponse.builder()
                .id(product.getId())
                .productName(product.getProductName())
                .sku(product.getSku())
                .brand(product.getBrand())
                .price(product.getPrice())
                .unit(product.getUnit())
                .categoryName(
                        product.getCategory().getCategoryName())
                .supplierName(
                        product.getSupplier().getSupplierName())
                .active(product.isActive())
                .build();
    }
}
