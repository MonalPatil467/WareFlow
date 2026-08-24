package com.example.companyservice.service;

import com.example.companyservice.dto.request.CreateCompanyRequest;
import com.example.companyservice.dto.request.UpdateCompanyRequest;
import com.example.companyservice.dto.response.CompanyResponse;

import java.util.List;

public interface CompanyService {

    CompanyResponse createCompany(CreateCompanyRequest request);

    CompanyResponse getCompanyById(Long id);

    List<CompanyResponse> getAllCompanies();

    CompanyResponse updateCompany(
            Long id,
            UpdateCompanyRequest request
    );

    void deleteCompany(Long id);
}
