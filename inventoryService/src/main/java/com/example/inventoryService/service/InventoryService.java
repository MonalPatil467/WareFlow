package com.example.inventoryService.service;

import com.example.inventoryService.dtos.request.CreateInventoryRequest;
import com.example.inventoryService.dtos.request.UpdateInventoryRequest;
import com.example.inventoryService.dtos.response.InventoryResponse;

import java.util.List;

public interface InventoryService {

    InventoryResponse createInventory(CreateInventoryRequest request);

    InventoryResponse updateInventory(Long id, UpdateInventoryRequest request);

    InventoryResponse getInventoryById(Long id);

    List<InventoryResponse> getAllInventory();

    List<InventoryResponse> getLowStockProducts();

    void deleteInventory(Long id);
}
