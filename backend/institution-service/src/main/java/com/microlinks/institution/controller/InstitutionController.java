package com.microlinks.institution.controller;

import com.microlinks.institution.dto.*;
import com.microlinks.institution.entity.StatutEntite;
import com.microlinks.institution.entity.TypeInstitution;
import com.microlinks.institution.service.InstitutionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/institutions")
@RequiredArgsConstructor
@Tag(name = "Institutions", description = "Gestion des institutions financières")
@SecurityRequirement(name = "bearerAuth")
public class InstitutionController {

    private final InstitutionService institutionService;

    @GetMapping
    @Operation(summary = "Lister les institutions avec pagination et filtres")
    public ResponseEntity<PagedResponse<InstitutionDto>> findAll(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) TypeInstitution type,
            @RequestParam(required = false) StatutEntite statut,
            @RequestParam(required = false) UUID zoneId,
            @RequestParam(required = false) String pays,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "nom") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir) {
        return ResponseEntity.ok(institutionService.findAll(
                search, type, statut, zoneId, pays, page, size, sortBy, sortDir));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtenir une institution par son ID")
    public ResponseEntity<InstitutionDto> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(institutionService.findById(id));
    }

    @GetMapping("/code/{code}")
    @Operation(summary = "Obtenir une institution par son code")
    public ResponseEntity<InstitutionDto> findByCode(@PathVariable String code) {
        return ResponseEntity.ok(institutionService.findByCode(code));
    }

    @PostMapping
    @Operation(summary = "Créer une nouvelle institution")
    @PreAuthorize("hasAnyRole('ADMIN_PLATEFORME', 'ADMIN_INSTITUTION')")
    public ResponseEntity<InstitutionDto> create(
            @Valid @RequestBody InstitutionCreateRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(institutionService.create(request, jwt.getSubject()));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Modifier une institution")
    @PreAuthorize("hasAnyRole('ADMIN_PLATEFORME', 'ADMIN_INSTITUTION')")
    public ResponseEntity<InstitutionDto> update(
            @PathVariable UUID id,
            @Valid @RequestBody InstitutionCreateRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(institutionService.update(id, request, jwt.getSubject()));
    }

    @PatchMapping("/{id}/statut")
    @Operation(summary = "Changer le statut d'une institution")
    @PreAuthorize("hasRole('ADMIN_PLATEFORME')")
    public ResponseEntity<Void> changerStatut(
            @PathVariable UUID id,
            @RequestParam StatutEntite statut,
            @AuthenticationPrincipal Jwt jwt) {
        institutionService.changerStatut(id, statut, jwt.getSubject());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/stats")
    @Operation(summary = "Statistiques des institutions pour le tableau de bord")
    public ResponseEntity<InstitutionService.DashboardStats> getStats() {
        return ResponseEntity.ok(institutionService.getStats());
    }
}
