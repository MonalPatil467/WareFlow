package com.example.inventoryService.dtos.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateCategoryRequest {

    @NotBlank(message = "Category name is required")
    private String categoryName;

    private String description;

    private boolean active;
}