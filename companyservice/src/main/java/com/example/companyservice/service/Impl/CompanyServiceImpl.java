package com.example.companyservice.service.Impl;

import com.example.companyservice.dto.request.CreateCompanyRequest;
import com.example.companyservice.dto.request.UpdateCompanyRequest;
import com.example.companyservice.dto.response.CompanyResponse;
import com.example.companyservice.entity.Company;
import com.example.companyservice.entity.SubscriptionPlan;
import com.example.companyservice.exception.BadRequestException;
import com.example.companyservice.exception.ResourceAlreadyExistsException;
import com.example.companyservice.exception.ResourceNotFoundException;
import com.example.companyservice.repository.CompanyRepository;
import com.example.companyservice.security.TenantContext;
import com.example.companyservice.service.CompanyService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CompanyServiceImpl implements CompanyService {

    private final CompanyRepository companyRepository;

    @Override
    public CompanyResponse createCompany(
            CreateCompanyRequest request) {

        if (request == null) {
            throw new BadRequestException(
                    "Company request cannot be null."
            );
        }

        String email = request.getEmail().trim().toLowerCase();
        String phone = request.getPhone().trim();
        String gstNumber = request.getGstNumber().trim().toUpperCase();

        if (companyRepository.existsByEmail(email)) {
            throw new ResourceAlreadyExistsException(
                    "Company with email '" + email + "' already exists."
            );
        }

        if (companyRepository.existsByPhone(phone)) {
            throw new ResourceAlreadyExistsException(
                    "Company with phone '" + phone + "' already exists."
            );
        }

        if (companyRepository.existsByGstNumber(gstNumber)) {
            throw new ResourceAlreadyExistsException(
                    "Company with GST number '" + gstNumber
                            + "' already exists."
            );
        }

        Company company = Company.builder()
                .companyName(request.getCompanyName().trim())
                .email(email)
                .phone(phone)
                .gstNumber(gstNumber)
                .address(request.getAddress().trim())
                .city(request.getCity().trim())
                .state(request.getState().trim())
                .country(request.getCountry().trim())
                .postalCode(request.getPostalCode().trim())
                .subscriptionPlan(request.getSubscriptionPlan())
                .licenseExpiry(
                        calculateLicenseExpiry(
                                request.getSubscriptionPlan()
                        )
                )
                .active(true)
                .build();

        Company savedCompany =
                companyRepository.save(company);

        return mapToResponse(savedCompany);
    }

    @Override
    public CompanyResponse getCompanyById(Long id) {

        validateId(id);

        Company company = getCompany(id);

        return mapToResponse(company);
    }

    @Override
    public List<CompanyResponse> getAllCompanies() {

        return companyRepository.findByActiveTrue()
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    public CompanyResponse updateCompany(
            Long id,
            UpdateCompanyRequest request) {

        validateId(id);

        if (request == null) {
            throw new BadRequestException(
                    "Company request cannot be null."
            );
        }

        Company company = getCompany(id);

        String email =
                request.getEmail().trim().toLowerCase();

        String phone =
                request.getPhone().trim();

        String gstNumber =
                request.getGstNumber().trim().toUpperCase();

        if (companyRepository.existsByEmailAndIdNot(
                email, id)) {

            throw new ResourceAlreadyExistsException(
                    "Company with email '" + email
                            + "' already exists."
            );
        }

        if (companyRepository.existsByPhoneAndIdNot(
                phone, id)) {

            throw new ResourceAlreadyExistsException(
                    "Company with phone '" + phone
                            + "' already exists."
            );
        }

        if (companyRepository.existsByGstNumberAndIdNot(
                gstNumber, id)) {

            throw new ResourceAlreadyExistsException(
                    "Company with GST number '" + gstNumber
                            + "' already exists."
            );
        }

        company.setCompanyName(
                request.getCompanyName().trim()
        );

        company.setEmail(email);
        company.setPhone(phone);
        company.setGstNumber(gstNumber);

        company.setAddress(
                request.getAddress().trim()
        );

        company.setCity(
                request.getCity().trim()
        );

        company.setState(
                request.getState().trim()
        );

        company.setCountry(
                request.getCountry().trim()
        );

        company.setPostalCode(
                request.getPostalCode().trim()
        );

        Company updatedCompany =
                companyRepository.save(company);

        return mapToResponse(updatedCompany);
    }

    @Override
    public void deleteCompany(Long id) {

        validateId(id);

        Company company = getCompany(id);


        company.setActive(false);

        companyRepository.save(company);
    }

    private Company getCompany(Long id) {

        return companyRepository
                .findByIdAndActiveTrue(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Company with id " + id
                                        + " not found."
                        )
                );
    }

    private void validateId(Long id) {

        if (id == null || id <= 0) {

            throw new BadRequestException(
                    "Invalid company id."
            );
        }
    }

    private LocalDate calculateLicenseExpiry(
            SubscriptionPlan plan) {

        if (plan == null) {

            throw new BadRequestException(
                    "Subscription plan is required."
            );
        }

        return switch (plan) {

            case FREE ->
                    LocalDate.now().plusDays(30);

            case BASIC ->
                    LocalDate.now().plusMonths(6);

            case PREMIUM ->
                    LocalDate.now().plusYears(1);

            case ENTERPRISE ->
                    LocalDate.now().plusYears(5);
        };
    }

    private CompanyResponse mapToResponse(
            Company company) {

        return CompanyResponse.builder()
                .id(company.getId())
                .companyName(company.getCompanyName())
                .email(company.getEmail())
                .phone(company.getPhone())
                .gstNumber(company.getGstNumber())
                .address(company.getAddress())
                .city(company.getCity())
                .state(company.getState())
                .country(company.getCountry())
                .postalCode(company.getPostalCode())
                .subscriptionPlan(
                        company.getSubscriptionPlan()
                )
                .licenseExpiry(
                        company.getLicenseExpiry()
                )
                .active(company.isActive())
                .createdAt(company.getCreatedAt())
                .updatedAt(company.getUpdatedAt())
                .build();
    }
}