package com.microlinks.billing.controller;

import com.microlinks.billing.dto.InstitutionBillingRequest;
import com.microlinks.billing.entity.InstitutionBilling;
import com.microlinks.billing.service.InstitutionBillingService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/institution-billing")
@RequiredArgsConstructor
@Tag(name = "Configuration facturation des institutions")
@SecurityRequirement(name = "bearerAuth")
public class InstitutionBillingController {

    private final InstitutionBillingService service;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN_PLATEFORME')")
    public ResponseEntity<List<InstitutionBilling>> findAll() {
        return ResponseEntity.ok(service.findAll());
    }

    @GetMapping("/{institutionId}")
    @PreAuthorize("hasAnyRole('ADMIN_PLATEFORME','ADMIN_INSTITUTION')")
    public ResponseEntity<InstitutionBilling> findByInstitution(@PathVariable UUID institutionId) {
        return ResponseEntity.ok(service.findByInstitution(institutionId));
    }

    @PutMapping
    @PreAuthorize("hasRole('ADMIN_PLATEFORME')")
    public ResponseEntity<InstitutionBilling> upsert(@Valid @RequestBody InstitutionBillingRequest req) {
        return ResponseEntity.ok(service.upsert(req));
    }
}
