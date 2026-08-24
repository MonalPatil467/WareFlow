package com.example.inventoryService.dtos.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class CategoryResponse {

    private Long id;

    private String categoryName;

    private String description;

    private boolean active;

    private LocalDateTime createdAt;

}
