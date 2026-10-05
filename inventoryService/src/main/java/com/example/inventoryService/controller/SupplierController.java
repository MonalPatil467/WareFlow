package com.example.inventoryService.controller;

import com.example.inventoryService.dtos.request.CreateSupplierRequest;
import com.example.inventoryService.dtos.request.UpdateSupplierRequest;
import com.example.inventoryService.dtos.response.SupplierResponse;
import com.example.inventoryService.service.SupplierService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/suppliers")
@RequiredArgsConstructor
public class SupplierController {

    private final SupplierService supplierService;

    @PostMapping
    public ResponseEntity<SupplierResponse> createSupplier(
            @Valid @RequestBody CreateSupplierRequest request) {

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(supplierService.createSupplier(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SupplierResponse> updateSupplier(
            @PathVariable Long id,
            @Valid @RequestBody UpdateSupplierRequest request) {

        return ResponseEntity.ok(
                supplierService.updateSupplier(id, request)
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<SupplierResponse> getSupplierById(
            @PathVariable Long id) {

        return ResponseEntity.ok(
                supplierService.getSupplierById(id)
        );
    }

    @GetMapping
    public ResponseEntity<List<SupplierResponse>> getAllSuppliers() {

        return ResponseEntity.ok(
                supplierService.getAllSuppliers()
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSupplier(
            @PathVariable Long id) {

        supplierService.deleteSupplier(id);

        return ResponseEntity.noContent().build();
    }
}