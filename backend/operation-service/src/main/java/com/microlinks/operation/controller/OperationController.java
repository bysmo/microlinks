package com.microlinks.operation.controller;

import com.microlinks.operation.dto.*;
import com.microlinks.operation.entity.StatutOperation;
import com.microlinks.operation.repository.HistoriqueStatutRepository;
import com.microlinks.operation.service.OperationService;
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
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/operations")
@RequiredArgsConstructor
@Tag(name = "Opérations", description = "Gestion des opérations financières (virements, chèques, prélèvements)")
@SecurityRequirement(name = "bearerAuth")
public class OperationController {

    private final OperationService operationService;
    private final HistoriqueStatutRepository historiqueRepository;

    @GetMapping
    @Operation(summary = "Lister les opérations avec filtres et pagination")
    public ResponseEntity<PagedResponse<OperationDto>> findAll(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) com.microlinks.operation.entity.TypeOperation typeOperation,
            @RequestParam(required = false) StatutOperation statut,
            @RequestParam(required = false) UUID institutionEmettriceId,
            @RequestParam(required = false) UUID institutionBeneficiaireId,
            @RequestParam(required = false) String dateDebut,
            @RequestParam(required = false) String dateFin,
            @RequestParam(required = false) String devise,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        OperationSearchRequest req = new OperationSearchRequest();
        req.setSearch(search);
        req.setTypeOperation(typeOperation);
        req.setStatut(statut);
        req.setInstitutionEmettriceId(institutionEmettriceId);
        req.setInstitutionBeneficiaireId(institutionBeneficiaireId);
        req.setDevise(devise);
        if (dateDebut != null) req.setDateDebut(java.time.LocalDate.parse(dateDebut));
        if (dateFin != null) req.setDateFin(java.time.LocalDate.parse(dateFin));

        return ResponseEntity.ok(operationService.findAll(req, page, size));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Détail d'une opération")
    public ResponseEntity<OperationDto> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(operationService.findById(id));
    }

    @GetMapping("/reference/{reference}")
    @Operation(summary = "Rechercher par référence")
    public ResponseEntity<OperationDto> findByReference(@PathVariable String reference) {
        return ResponseEntity.ok(operationService.findByReference(reference));
    }

    @GetMapping("/{id}/historique")
    @Operation(summary = "Historique du workflow d'une opération")
    public ResponseEntity<List<?>> getHistorique(@PathVariable UUID id) {
        return ResponseEntity.ok(historiqueRepository.findByOperationIdOrderByDateActionAsc(id));
    }

    @PostMapping
    @Operation(summary = "Créer une nouvelle opération")
    @PreAuthorize("hasAnyRole('AGENT_SAISIE', 'AGENT_VALIDATION', 'ADMIN_INSTITUTION', 'ADMIN_PLATEFORME')")
    public ResponseEntity<OperationDto> create(
            @Valid @RequestBody OperationCreateRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        UUID institutionId = extractInstitutionId(jwt);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(operationService.create(request, jwt.getSubject(),
                        jwt.getClaimAsString("name"), institutionId));
    }

    @PostMapping("/{id}/soumettre")
    @Operation(summary = "Soumettre une opération pour validation")
    @PreAuthorize("hasAnyRole('AGENT_SAISIE', 'AGENT_VALIDATION', 'ADMIN_INSTITUTION')")
    public ResponseEntity<OperationDto> soumettre(
            @PathVariable UUID id,
            @RequestBody(required = false) Map<String, String> body,
            @AuthenticationPrincipal Jwt jwt) {
        String commentaire = body != null ? body.get("commentaire") : null;
        return ResponseEntity.ok(operationService.soumettre(id, commentaire,
                jwt.getSubject(), jwt.getClaimAsString("name"), extractInstitutionId(jwt)));
    }

    @PostMapping("/{id}/valider")
    @Operation(summary = "Valider une opération (avancer dans le workflow)")
    @PreAuthorize("hasAnyRole('AGENT_VALIDATION', 'ADMIN_INSTITUTION', 'ADMIN_PLATEFORME')")
    public ResponseEntity<OperationDto> valider(
            @PathVariable UUID id,
            @RequestParam StatutOperation nouveauStatut,
            @RequestBody(required = false) Map<String, String> body,
            @AuthenticationPrincipal Jwt jwt) {
        String commentaire = body != null ? body.get("commentaire") : null;
        return ResponseEntity.ok(operationService.valider(id, nouveauStatut, commentaire,
                jwt.getSubject(), jwt.getClaimAsString("name"), extractInstitutionId(jwt)));
    }

    @PostMapping("/{id}/rejeter")
    @Operation(summary = "Rejeter une opération")
    @PreAuthorize("hasAnyRole('AGENT_VALIDATION', 'ADMIN_INSTITUTION', 'ADMIN_PLATEFORME')")
    public ResponseEntity<OperationDto> rejeter(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(operationService.rejeter(id,
                body.getOrDefault("motif", "Rejet sans motif"),
                jwt.getSubject(), jwt.getClaimAsString("name"), extractInstitutionId(jwt)));
    }

    @PostMapping("/{id}/annuler")
    @Operation(summary = "Annuler une opération (émetteur uniquement)")
    public ResponseEntity<OperationDto> annuler(
            @PathVariable UUID id,
            @RequestBody(required = false) Map<String, String> body,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(operationService.annuler(id,
                body != null ? body.get("motif") : null,
                jwt.getSubject(), extractInstitutionId(jwt)));
    }

    @GetMapping("/stats")
    @Operation(summary = "Statistiques des opérations")
    public ResponseEntity<OperationStatsDto> getStats(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(operationService.getStats(extractInstitutionId(jwt)));
    }

    private UUID extractInstitutionId(Jwt jwt) {
        String institutionId = jwt.getClaimAsString("institution_id");
        if (institutionId != null) {
            try { return UUID.fromString(institutionId); } catch (Exception ignored) {}
        }
        return null;
    }
}
