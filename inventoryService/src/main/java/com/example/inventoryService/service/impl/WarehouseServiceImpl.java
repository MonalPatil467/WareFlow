package com.example.inventoryService.service.impl;

import com.example.inventoryService.dtos.request.CreateWarehouseRequest;
import com.example.inventoryService.dtos.request.UpdateWarehouseRequest;
import com.example.inventoryService.dtos.response.WarehouseResponse;
import com.example.inventoryService.entity.Warehouse;
import com.example.inventoryService.exception.BadRequestException;
import com.example.inventoryService.exception.ResourceAlreadyExistsException;
import com.example.inventoryService.exception.ResourceNotFoundException;
import com.example.inventoryService.repository.WarehouseRepository;
import com.example.inventoryService.security.TenantContext;
import com.example.inventoryService.service.WarehouseService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class WarehouseServiceImpl implements WarehouseService {

    private final WarehouseRepository warehouseRepository;

    @Override
    public WarehouseResponse createWarehouse(
            CreateWarehouseRequest request) {

        Long companyId = getCompanyId();

        if (request == null) {
            throw new BadRequestException(
                    "Warehouse request cannot be null."
            );
        }

        String warehouseName = request.getWarehouseName().trim();

        if (warehouseRepository
                .existsByWarehouseNameAndCompanyId(
                        warehouseName,
                        companyId)) {

            throw new ResourceAlreadyExistsException(
                    "Warehouse '" + warehouseName
                            + "' already exists."
            );
        }

        Warehouse warehouse = Warehouse.builder()
                .warehouseName(warehouseName)
                .address(request.getAddress())
                .city(request.getCity())
                .state(request.getState())
                .country(request.getCountry())
                .postalCode(request.getPostalCode())
                .companyId(companyId)
                .active(true)
                .build();

        Warehouse savedWarehouse =
                warehouseRepository.save(warehouse);

        return mapToResponse(savedWarehouse);
    }

    @Override
    public WarehouseResponse updateWarehouse(
            Long id,
            UpdateWarehouseRequest request) {

        Long companyId = getCompanyId();

        validateId(id);

        if (request == null) {
            throw new BadRequestException(
                    "Warehouse request cannot be null."
            );
        }

        Warehouse warehouse =
                warehouseRepository
                        .findByIdAndCompanyId(id, companyId)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Warehouse with id "
                                                + id
                                                + " not found."
                                ));

        String warehouseName =
                request.getWarehouseName().trim();

        if (!warehouse.getWarehouseName()
                .equalsIgnoreCase(warehouseName)
                && warehouseRepository
                .existsByWarehouseNameAndCompanyId(
                        warehouseName,
                        companyId)) {

            throw new ResourceAlreadyExistsException(
                    "Warehouse '" + warehouseName
                            + "' already exists."
            );
        }

        warehouse.setWarehouseName(warehouseName);
        warehouse.setAddress(request.getAddress());
        warehouse.setCity(request.getCity());
        warehouse.setState(request.getState());
        warehouse.setCountry(request.getCountry());
        warehouse.setPostalCode(request.getPostalCode());
        warehouse.setActive(request.isActive());

        Warehouse updatedWarehouse =
                warehouseRepository.save(warehouse);

        return mapToResponse(updatedWarehouse);
    }

    @Override
    public WarehouseResponse getWarehouseById(Long id) {

        Long companyId = getCompanyId();

        validateId(id);

        Warehouse warehouse =
                warehouseRepository
                        .findByIdAndCompanyId(id, companyId)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Warehouse with id "
                                                + id
                                                + " not found."
                                ));

        if (!warehouse.isActive()) {
            throw new ResourceNotFoundException(
                    "Warehouse with id "
                            + id
                            + " not found."
            );
        }

        return mapToResponse(warehouse);
    }

    @Override
    public List<WarehouseResponse> getAllWarehouses() {

        Long companyId = getCompanyId();

        return warehouseRepository
                .findByCompanyId(companyId)
                .stream()
                .filter(Warehouse::isActive)
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    public void deleteWarehouse(Long id) {

        Long companyId = getCompanyId();

        validateId(id);

        Warehouse warehouse =
                warehouseRepository
                        .findByIdAndCompanyId(id, companyId)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Warehouse with id "
                                                + id
                                                + " not found."
                                ));

        if (!warehouse.isActive()) {
            throw new ResourceNotFoundException(
                    "Warehouse with id "
                            + id
                            + " not found."
            );
        }

        warehouse.setActive(false);

        warehouseRepository.save(warehouse);
    }

    private Long getCompanyId() {

        Long companyId = TenantContext.getCompanyId();

        if (companyId == null) {
            throw new BadRequestException(
                    "Company not found in JWT."
            );
        }

        return companyId;
    }

    private void validateId(Long id) {

        if (id == null || id <= 0) {
            throw new BadRequestException(
                    "Invalid warehouse id."
            );
        }
    }

    private WarehouseResponse mapToResponse(
            Warehouse warehouse) {

        return WarehouseResponse.builder()
                .id(warehouse.getId())
                .warehouseName(warehouse.getWarehouseName())
                .address(warehouse.getAddress())
                .city(warehouse.getCity())
                .state(warehouse.getState())
                .country(warehouse.getCountry())
                .postalCode(warehouse.getPostalCode())
                .active(warehouse.isActive())
                .createdAt(warehouse.getCreatedAt())
                .updatedAt(warehouse.getUpdatedAt())
                .build();
    }
}