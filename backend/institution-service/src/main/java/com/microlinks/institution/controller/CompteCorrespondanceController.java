package com.microlinks.institution.controller;

import com.microlinks.institution.dto.CompteCorrespondanceDto;
import com.microlinks.institution.dto.CompteCorrespondanceRequest;
import com.microlinks.institution.service.CompteCorrespondanceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/institutions/{institutionId}/comptes-reglement")
@RequiredArgsConstructor
@Tag(name = "Comptes de Règlement", description = "Gestion des comptes de règlement et correspondance d'une institution")
@SecurityRequirement(name = "bearerAuth")
public class CompteCorrespondanceController {

    private final CompteCorrespondanceService service;

    @GetMapping
    @Operation(summary = "Lister les comptes de règlement d'une institution")
    public ResponseEntity<List<CompteCorrespondanceDto>> findAll(@PathVariable UUID institutionId) {
        return ResponseEntity.ok(service.findByInstitution(institutionId));
    }

    @PostMapping
    @Operation(summary = "Ajouter un compte de règlement")
    @PreAuthorize("hasAnyRole('ADMIN_PLATEFORME', 'ADMIN_INSTITUTION')")
    public ResponseEntity<CompteCorrespondanceDto> create(
            @PathVariable UUID institutionId,
            @Valid @RequestBody CompteCorrespondanceRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.create(institutionId, request));
    }

    @PutMapping("/{compteId}")
    @Operation(summary = "Modifier un compte de règlement")
    @PreAuthorize("hasAnyRole('ADMIN_PLATEFORME', 'ADMIN_INSTITUTION')")
    public ResponseEntity<CompteCorrespondanceDto> update(
            @PathVariable UUID institutionId,
            @PathVariable UUID compteId,
            @Valid @RequestBody CompteCorrespondanceRequest request) {
        return ResponseEntity.ok(service.update(institutionId, compteId, request));
    }

    @DeleteMapping("/{compteId}")
    @Operation(summary = "Supprimer un compte de règlement")
    @PreAuthorize("hasAnyRole('ADMIN_PLATEFORME', 'ADMIN_INSTITUTION')")
    public ResponseEntity<Void> delete(
            @PathVariable UUID institutionId,
            @PathVariable UUID compteId) {
        service.delete(institutionId, compteId);
        return ResponseEntity.noContent().build();
    }
}
