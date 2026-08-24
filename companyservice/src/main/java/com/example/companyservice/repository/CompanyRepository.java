package com.example.companyservice.repository;

import com.example.companyservice.entity.Company;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CompanyRepository extends JpaRepository<Company, Long> {

    boolean existsByEmail(String email);

    boolean existsByPhone(String phone);

    boolean existsByGstNumber(String gstNumber);

    Optional<Company> findByIdAndActiveTrue(Long id);

    List<Company> findByActiveTrue();

    boolean existsByEmailAndIdNot(String email, Long id);

    boolean existsByPhoneAndIdNot(String phone, Long id);

    boolean existsByGstNumberAndIdNot(String gstNumber, Long id);
}
