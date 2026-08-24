package com.example.companyservice.controller;

import com.example.companyservice.dto.request.CreateCompanyRequest;
import com.example.companyservice.dto.request.UpdateCompanyRequest;
import com.example.companyservice.dto.response.CompanyResponse;
import com.example.companyservice.security.TenantContext;
import com.example.companyservice.service.CompanyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/companies")
@RequiredArgsConstructor
public class CompanyController {

    private final CompanyService companyService;


    @PostMapping
    public ResponseEntity<CompanyResponse> createCompany(
            @Valid @RequestBody CreateCompanyRequest request) {

        CompanyResponse response =
                companyService.createCompany(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }


    @GetMapping("/{id}")
    public ResponseEntity<CompanyResponse> getCompanyById(
            @PathVariable Long id) {

        validateTenant(id);

        return ResponseEntity.ok(
                companyService.getCompanyById(id)
        );
    }


    @GetMapping
    public ResponseEntity<List<CompanyResponse>>
    getAllCompanies() {

        return ResponseEntity.ok(
                companyService.getAllCompanies()
        );
    }

    @PutMapping("/{id}")
    public ResponseEntity<CompanyResponse> updateCompany(
            @PathVariable Long id,
            @Valid @RequestBody UpdateCompanyRequest request) {

        validateTenant(id);

        return ResponseEntity.ok(
                companyService.updateCompany(
                        id,
                        request
                )
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCompany(
            @PathVariable Long id) {

        validateTenant(id);

        companyService.deleteCompany(id);

        return ResponseEntity.noContent().build();
    }

    private void validateTenant(Long requestedCompanyId) {

        Long jwtCompanyId =
                TenantContext.getCompanyId();

        if (jwtCompanyId == null ||
                !jwtCompanyId.equals(requestedCompanyId)) {

            throw new com.example.companyservice.exception
                    .BadRequestException(
                    "You are not authorized to access this company."
            );
        }
    }
}