package com.example.inventoryService.controller;

import com.example.inventoryService.dtos.request.CreateWarehouseRequest;
import com.example.inventoryService.dtos.request.UpdateWarehouseRequest;
import com.example.inventoryService.dtos.response.WarehouseResponse;
import com.example.inventoryService.service.WarehouseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/warehouses")
@RequiredArgsConstructor
public class WarehouseController {

    private final WarehouseService warehouseService;

    @PostMapping
    public ResponseEntity<WarehouseResponse> createWarehouse(
            @Valid @RequestBody CreateWarehouseRequest request) {

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(warehouseService.createWarehouse(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<WarehouseResponse> updateWarehouse(
            @PathVariable Long id,
            @Valid @RequestBody UpdateWarehouseRequest request) {

        return ResponseEntity.ok(
                warehouseService.updateWarehouse(id, request)
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<WarehouseResponse> getWarehouseById(
            @PathVariable Long id) {

        return ResponseEntity.ok(
                warehouseService.getWarehouseById(id)
        );
    }

    @GetMapping
    public ResponseEntity<List<WarehouseResponse>> getAllWarehouses() {

        return ResponseEntity.ok(
                warehouseService.getAllWarehouses()
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteWarehouse(
            @PathVariable Long id) {

        warehouseService.deleteWarehouse(id);

        return ResponseEntity.noContent().build();
    }
}