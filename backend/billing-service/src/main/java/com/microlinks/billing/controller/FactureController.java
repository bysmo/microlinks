package com.microlinks.billing.controller;

import com.microlinks.billing.dto.PaiementRequest;
import com.microlinks.billing.entity.Facture;
import com.microlinks.billing.entity.Paiement;
import com.microlinks.billing.service.FactureService;
import com.microlinks.billing.client.PinValidationClient;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import java.time.YearMonth;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

/**
 * Contrôleur REST pour la gestion et la consultation des factures.
 * Protégé par rôles Keycloak et vérification du PIN de sécurité pour les paiements.
 */
@RestController
@RequestMapping("/api/v1/factures")
@RequiredArgsConstructor
@Tag(name = "Factures", description = "Gestion et consultation des factures")
@SecurityRequirement(name = "bearerAuth")
public class FactureController {

    private final FactureService factureService;
    private final PinValidationClient pinValidationClient;

    @GetMapping
    @Operation(summary = "Lister toutes les factures (admin plateforme)")
    @PreAuthorize("hasRole('ADMIN_PLATEFORME')")
    public ResponseEntity<List<Facture>> findAll() {
        return ResponseEntity.ok(factureService.findAll());
    }

    @GetMapping("/mes-factures")
    @Operation(summary = "Factures de l'institution de l'utilisateur connecté")
    public ResponseEntity<List<Facture>> mesFactures(@AuthenticationPrincipal Jwt jwt) {
        UUID institutionId = extractInstitutionId(jwt);
        if (institutionId == null) {
            return ResponseEntity.ok(Collections.emptyList());
        }
        return ResponseEntity.ok(factureService.findByInstitution(institutionId));
    }

    @GetMapping("/institution/{institutionId}")
    @Operation(summary = "Factures d'une institution donnée")
    @PreAuthorize("hasAnyRole('ADMIN_PLATEFORME','ADMIN_INSTITUTION')")
    public ResponseEntity<List<Facture>> byInstitution(@PathVariable UUID institutionId) {
        return ResponseEntity.ok(factureService.findByInstitution(institutionId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Facture> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(factureService.findById(id));
    }

    @GetMapping("/{id}/paiements")
    public ResponseEntity<List<Paiement>> getPaiements(@PathVariable UUID id) {
        return ResponseEntity.ok(factureService.getPaiements(id));
    }

    @PostMapping("/generer")
    @Operation(summary = "Déclencher manuellement la génération des factures d'une période (YYYY-MM)")
    @PreAuthorize("hasRole('ADMIN_PLATEFORME')")
    public ResponseEntity<List<Facture>> generer(@RequestParam(required = false) String periode) {
        YearMonth ym = (periode != null && !periode.isBlank())
                ? YearMonth.parse(periode) : YearMonth.now().minusMonths(1);
        return ResponseEntity.ok(factureService.genererFacturesMensuelles(ym));
    }

    @PostMapping("/{id}/paiement")
    @Operation(summary = "Enregistrer un paiement sur une facture")
    @PreAuthorize("hasRole('ADMIN_PLATEFORME')")
    public ResponseEntity<Facture> payer(@PathVariable UUID id,
                                         @Valid @RequestBody PaiementRequest req,
                                         @RequestHeader(name = "X-Validation-PIN", required = false) String pin,
                                         @AuthenticationPrincipal Jwt jwt) {
        validateUserPin(jwt, pin);
        return ResponseEntity.ok(factureService.enregistrerPaiement(id, req, jwt.getSubject()));
    }

    @PostMapping("/{id}/annuler")
    @PreAuthorize("hasRole('ADMIN_PLATEFORME')")
    public ResponseEntity<Facture> annuler(@PathVariable UUID id) {
        return ResponseEntity.ok(factureService.annuler(id));
    }

    @PostMapping("/traiter-retards")
    @Operation(summary = "Déclencher manuellement le traitement des factures en retard")
    @PreAuthorize("hasRole('ADMIN_PLATEFORME')")
    public ResponseEntity<Void> traiterRetards() {
        factureService.traiterFacturesEnRetard();
        return ResponseEntity.noContent().build();
    }

    /**
     * Valide le code PIN de sécurité de l'utilisateur connecté auprès du service d'institution.
     */
    private void validateUserPin(Jwt jwt, String pin) {
        if (pin == null || pin.isBlank()) {
            throw new RuntimeException("Code PIN de validation obligatoire pour cette opération financière.");
        }
        boolean isValid = pinValidationClient.validatePin(jwt.getSubject(), pin);
        if (!isValid) {
            throw new RuntimeException("Code PIN de validation incorrect.");
        }
    }

    private UUID extractInstitutionId(Jwt jwt) {
        String institutionId = jwt.getClaimAsString("institution_id");
        if (institutionId != null) {
            try { return UUID.fromString(institutionId); } catch (Exception ignored) {}
        }
        java.util.List<String> instIds = jwt.getClaimAsStringList("institution_id");
        if (instIds != null && !instIds.isEmpty()) {
            try { return UUID.fromString(instIds.get(0)); } catch (Exception ignored) {}
        }
        return null;
    }
}
