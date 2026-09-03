package com.example.inventoryService.service;

import com.example.inventoryService.dtos.request.CreateWarehouseRequest;
import com.example.inventoryService.dtos.request.UpdateWarehouseRequest;
import com.example.inventoryService.dtos.response.WarehouseResponse;

import java.util.List;

public interface WarehouseService {

    WarehouseResponse createWarehouse(
            CreateWarehouseRequest request
    );

    WarehouseResponse updateWarehouse(
            Long id,
            UpdateWarehouseRequest request
    );

    WarehouseResponse getWarehouseById(Long id);

    List<WarehouseResponse> getAllWarehouses();

    void deleteWarehouse(Long id);
}