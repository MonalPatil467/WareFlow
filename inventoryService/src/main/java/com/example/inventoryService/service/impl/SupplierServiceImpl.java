package com.example.inventoryService.service.impl;

import com.example.inventoryService.dtos.request.CreateSupplierRequest;
import com.example.inventoryService.dtos.request.UpdateSupplierRequest;
import com.example.inventoryService.dtos.response.SupplierResponse;
import com.example.inventoryService.entity.Supplier;
import com.example.inventoryService.exception.BadRequestException;
import com.example.inventoryService.exception.ResourceAlreadyExistsException;
import com.example.inventoryService.exception.ResourceNotFoundException;
import com.example.inventoryService.repository.SupplierRepository;
import com.example.inventoryService.security.TenantContext;
import com.example.inventoryService.service.SupplierService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SupplierServiceImpl implements SupplierService {

    private final SupplierRepository supplierRepository;

    @Override
    public SupplierResponse createSupplier(CreateSupplierRequest request) {

        Long companyId = getCompanyId();

        if (request == null) {
            throw new BadRequestException("Supplier request cannot be null.");
        }

        if (supplierRepository.existsByEmailAndCompanyId(
                request.getEmail(), companyId)) {

            throw new ResourceAlreadyExistsException(
                    "Supplier with email '" + request.getEmail() + "' already exists.");
        }

        Supplier supplier = Supplier.builder()
                .supplierName(request.getSupplierName())
                .contactPerson(request.getContactPerson())
                .email(request.getEmail())
                .phoneNumber(request.getPhoneNumber())
                .address(request.getAddress())
                .city(request.getCity())
                .state(request.getState())
                .country(request.getCountry())
                .postalCode(request.getPostalCode())
                .companyId(companyId)
                .active(true)
                .build();

        Supplier savedSupplier = supplierRepository.save(supplier);

        return mapToResponse(savedSupplier);
    }

    @Override
    public SupplierResponse updateSupplier(Long id, UpdateSupplierRequest request) {

        Long companyId = getCompanyId();
        validateId(id);

        if (request == null) {
            throw new BadRequestException("Supplier request cannot be null.");
        }

        Supplier supplier = supplierRepository
                .findByIdAndCompanyId(id, companyId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Supplier with id " + id + " not found."));


        if (!supplier.getEmail().equalsIgnoreCase(request.getEmail())
                && supplierRepository.existsByEmailAndCompanyId(
                request.getEmail(), companyId)) {

            throw new ResourceAlreadyExistsException(
                    "Supplier with email '" + request.getEmail() + "' already exists.");
        }

        supplier.setSupplierName(request.getSupplierName());
        supplier.setContactPerson(request.getContactPerson());
        supplier.setEmail(request.getEmail());
        supplier.setPhoneNumber(request.getPhoneNumber());
        supplier.setAddress(request.getAddress());
        supplier.setCity(request.getCity());
        supplier.setState(request.getState());
        supplier.setCountry(request.getCountry());
        supplier.setPostalCode(request.getPostalCode());
        supplier.setActive(request.isActive());

        Supplier updatedSupplier = supplierRepository.save(supplier);

        return mapToResponse(updatedSupplier);
    }

    @Override
    public SupplierResponse getSupplierById(Long id) {

        Long companyId = getCompanyId();
        validateId(id);

        Supplier supplier = supplierRepository
                .findByIdAndCompanyId(id, companyId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Supplier with id " + id + " not found."));

        if (!supplier.isActive()) {
            throw new ResourceNotFoundException(
                    "Supplier with id " + id + " not found.");
        }

        return mapToResponse(supplier);
    }

    @Override
    public List<SupplierResponse> getAllSuppliers() {

        Long companyId = getCompanyId();

        return supplierRepository.findByCompanyId(companyId)
                .stream()
                .filter(Supplier::isActive)
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    public void deleteSupplier(Long id) {

        Long companyId = getCompanyId();
        validateId(id);

        Supplier supplier = supplierRepository
                .findByIdAndCompanyId(id, companyId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Supplier with id " + id + " not found."));

        // Soft delete
        supplier.setActive(false);
        supplierRepository.save(supplier);
    }

    private Long getCompanyId() {

        Long companyId = TenantContext.getCompanyId();

        if (companyId == null) {
            throw new BadRequestException("Company not found in JWT.");
        }

        return companyId;
    }


    private void validateId(Long id) {

        if (id == null || id <= 0) {
            throw new BadRequestException("Invalid supplier id.");
        }
    }

    private SupplierResponse mapToResponse(Supplier supplier) {

        return SupplierResponse.builder()
                .id(supplier.getId())
                .supplierName(supplier.getSupplierName())
                .contactPerson(supplier.getContactPerson())
                .email(supplier.getEmail())
                .phoneNumber(supplier.getPhoneNumber())
                .address(supplier.getAddress())
                .city(supplier.getCity())
                .state(supplier.getState())
                .country(supplier.getCountry())
                .postalCode(supplier.getPostalCode())
                .active(supplier.isActive())
                .build();
    }
}