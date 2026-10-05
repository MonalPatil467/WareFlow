package com.example.apiGateway.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class GatewayController {

    @GetMapping("/public")
    public String publicEndpoint() {
        return "Public endpoint is working";
    }
}