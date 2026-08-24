package com.example.inventoryService.service;

import com.example.inventoryService.dtos.request.CreateSupplierRequest;
import com.example.inventoryService.dtos.request.UpdateSupplierRequest;
import com.example.inventoryService.dtos.response.SupplierResponse;
import com.example.inventoryService.exception.ResourceAlreadyExistsException;

import java.util.List;

public interface SupplierService {
    SupplierResponse createSupplier(CreateSupplierRequest request) throws ResourceAlreadyExistsException;

    SupplierResponse updateSupplier(Long id, UpdateSupplierRequest request);

    SupplierResponse getSupplierById(Long id);

    List<SupplierResponse> getAllSuppliers();

    void deleteSupplier(Long id);
}
