package com.microlinks.operation.controller;

import com.microlinks.operation.dto.*;
import com.microlinks.operation.entity.StatutOperation;
import com.microlinks.operation.repository.HistoriqueStatutRepository;
import com.microlinks.operation.service.OperationService;
import com.microlinks.operation.service.AmlService;
import com.microlinks.operation.client.PinValidationClient;
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

/**
 * Contrôleur REST exposant les opérations financières de MicroLinks.
 * Sécurisé par rôles Keycloak et vérification systématique de code PIN pour les écritures.
 */
@RestController
@RequestMapping("/api/v1/operations")
@RequiredArgsConstructor
@Tag(name = "Opérations", description = "Gestion des opérations financières (virements, chèques, prélèvements)")
@SecurityRequirement(name = "bearerAuth")
public class OperationController {

    private final OperationService operationService;
    private final HistoriqueStatutRepository historiqueRepository;
    private final AmlService amlService;
    private final PinValidationClient pinValidationClient;

    @GetMapping
    @Operation(summary = "Lister les opérations avec filtres et pagination")
    public ResponseEntity<PagedResponse<OperationDto>> findAll(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) com.microlinks.operation.entity.TypeOperation typeOperation,
            @RequestParam(required = false) StatutOperation statut,
            @RequestParam(required = false) UUID institutionEmettriceId,
            @RequestParam(required = false) UUID institutionBeneficiaireId,
            @RequestParam(required = false) UUID banqueCorrespondanteEmettriceId,
            @RequestParam(required = false) UUID banqueCorrespondanteReceptriceId,
            @RequestParam(required = false) String dateDebut,
            @RequestParam(required = false) String dateFin,
            @RequestParam(required = false) String devise,
            @RequestParam(required = false) Boolean excludeTerminal,
            @RequestParam(required = false) Boolean onlyTerminal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal Jwt jwt) {

        UUID userInstId = extractInstitutionId(jwt);
        boolean isPlatformAdmin = false;
        java.util.Map<String, Object> realmAccess = jwt.getClaimAsMap("realm_access");
        if (realmAccess != null && realmAccess.containsKey("roles")) {
            @SuppressWarnings("unchecked")
            java.util.List<String> roles = (java.util.List<String>) realmAccess.get("roles");
            isPlatformAdmin = roles.contains("ADMIN_PLATEFORME");
        }

        OperationSearchRequest req = new OperationSearchRequest();
        req.setSearch(search);
        req.setTypeOperation(typeOperation);
        req.setStatut(statut);
        req.setInstitutionEmettriceId(institutionEmettriceId);
        req.setInstitutionBeneficiaireId(institutionBeneficiaireId);
        req.setBanqueCorrespondanteEmettriceId(banqueCorrespondanteEmettriceId);
        req.setBanqueCorrespondanteReceptriceId(banqueCorrespondanteReceptriceId);
        if (!isPlatformAdmin) {
            req.setInstitutionId(userInstId);
        }
        req.setDevise(devise);
        req.setExcludeTerminal(excludeTerminal);
        req.setOnlyTerminal(onlyTerminal);
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
            @RequestHeader(name = "X-Validation-PIN", required = false) String pin,
            @AuthenticationPrincipal Jwt jwt) {
        validateUserPin(jwt, pin);
        UUID institutionId = extractInstitutionId(jwt);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(operationService.create(request, jwt.getSubject(),
                        jwt.getClaimAsString("name"), institutionId));
    }

    @PostMapping("/bulk")
    @Operation(summary = "Importer des opérations en masse depuis un fichier Excel")
    @PreAuthorize("hasAnyRole('AGENT_SAISIE', 'AGENT_VALIDATION', 'ADMIN_INSTITUTION', 'ADMIN_PLATEFORME')")
    public ResponseEntity<BulkOperationResult> createBulk(
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file,
            @RequestParam("typeDebit") String typeDebit,
            @RequestParam("institutionEmettriceId") UUID institutionEmettriceId,
            @RequestParam("nomInstitutionEmettrice") String nomInstitutionEmettrice,
            @RequestParam("institutionBeneficiaireId") UUID institutionBeneficiaireId,
            @RequestParam("nomInstitutionBeneficiaire") String nomInstitutionBeneficiaire,
            @RequestParam(value = "compteDonneurOrdreGlobal", required = false) String compteDonneurOrdreGlobal,
            @RequestParam(value = "nomDonneurOrdreGlobal", required = false) String nomDonneurOrdreGlobal,
            @RequestParam(value = "typeOperation", defaultValue = "VIREMENT") com.microlinks.operation.entity.TypeOperation typeOperation,
            @RequestHeader(name = "X-Validation-PIN", required = false) String pin,
            @AuthenticationPrincipal Jwt jwt) {
        validateUserPin(jwt, pin);
        UUID institutionId = extractInstitutionId(jwt);
        return ResponseEntity.ok(operationService.createBulk(
                file, typeDebit, institutionEmettriceId, nomInstitutionEmettrice,
                institutionBeneficiaireId, nomInstitutionBeneficiaire,
                compteDonneurOrdreGlobal, nomDonneurOrdreGlobal, typeOperation,
                jwt.getSubject(), jwt.getClaimAsString("name"), institutionId));
    }

    @PostMapping("/{id}/soumettre")
    @Operation(summary = "Soumettre une opération pour validation")
    @PreAuthorize("hasAnyRole('AGENT_SAISIE', 'AGENT_VALIDATION', 'ADMIN_INSTITUTION')")
    public ResponseEntity<OperationDto> soumettre(
            @PathVariable UUID id,
            @RequestBody(required = false) Map<String, String> body,
            @RequestHeader(name = "X-Validation-PIN", required = false) String pin,
            @AuthenticationPrincipal Jwt jwt) {
        validateUserPin(jwt, pin);
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
            @RequestHeader(name = "X-Validation-PIN", required = false) String pin,
            @AuthenticationPrincipal Jwt jwt) {
        validateUserPin(jwt, pin);
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
            @RequestHeader(name = "X-Validation-PIN", required = false) String pin,
            @AuthenticationPrincipal Jwt jwt) {
        validateUserPin(jwt, pin);
        return ResponseEntity.ok(operationService.rejeter(id,
                body.getOrDefault("motif", "Rejet sans motif"),
                jwt.getSubject(), jwt.getClaimAsString("name"), extractInstitutionId(jwt)));
    }

    @PostMapping("/{id}/annuler")
    @Operation(summary = "Annuler une opération (émetteur uniquement)")
    public ResponseEntity<OperationDto> annuler(
            @PathVariable UUID id,
            @RequestBody(required = false) Map<String, String> body,
            @RequestHeader(name = "X-Validation-PIN", required = false) String pin,
            @AuthenticationPrincipal Jwt jwt) {
        validateUserPin(jwt, pin);
        return ResponseEntity.ok(operationService.annuler(id,
                body != null ? body.get("motif") : null,
                jwt.getSubject(), extractInstitutionId(jwt)));
    }

    @GetMapping("/stats")
    @Operation(summary = "Statistiques des opérations")
    public ResponseEntity<OperationStatsDto> getStats(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(operationService.getStats(extractInstitutionId(jwt)));
    }

    @GetMapping("/security/scan")
    @PreAuthorize("hasRole('ADMIN_PLATEFORME')")
    @Operation(summary = "Lancer un audit et scan complet de l'immuabilité et de la sécurité des données")
    public ResponseEntity<SecurityScanResult> runSecurityScan() {
        return ResponseEntity.ok(operationService.runSecurityScan());
    }

    @GetMapping("/aml/sanctions")
    @Operation(summary = "Lister les sanctions AML/CFT")
    public ResponseEntity<List<com.microlinks.operation.entity.AmlSanction>> getSanctions() {
        return ResponseEntity.ok(amlService.getAllSanctions());
    }

    @PostMapping("/aml/sanctions/import-excel")
    @Operation(summary = "Importer des sanctions depuis un fichier Excel")
    public ResponseEntity<Map<String, String>> importExcel(
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        try {
            amlService.importSanctionsFromExcel(file.getInputStream(), file.getOriginalFilename());
            return ResponseEntity.ok(Map.of("message", "Importation réussie"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Erreur lors de l'importation : " + e.getMessage()));
        }
    }

    @PostMapping("/aml/sanctions/sync-web")
    @Operation(summary = "Synchroniser la liste des sanctions avec les listes Web (ONU, OFAC...)")
    public ResponseEntity<Map<String, String>> syncWeb(@RequestParam(required = false) String url) {
        amlService.updateSanctionsFromWeb(url);
        return ResponseEntity.ok(Map.of("message", "Synchronisation web réussie (ou liste de démonstration chargée)"));
    }

    @GetMapping("/aml/suspended")
    @Operation(summary = "Lister les opérations suspendues pour motif AML/CFT")
    public ResponseEntity<PagedResponse<OperationDto>> getSuspended(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal Jwt jwt) {
        OperationSearchRequest req = new OperationSearchRequest();
        req.setStatut(StatutOperation.SUSPENDU_AML);

        UUID userInstId = extractInstitutionId(jwt);
        boolean isPlatformAdmin = false;
        java.util.Map<String, Object> realmAccess = jwt.getClaimAsMap("realm_access");
        if (realmAccess != null && realmAccess.containsKey("roles")) {
            @SuppressWarnings("unchecked")
            java.util.List<String> roles = (java.util.List<String>) realmAccess.get("roles");
            isPlatformAdmin = roles.contains("ADMIN_PLATEFORME");
        }
        if (!isPlatformAdmin) {
            req.setInstitutionId(userInstId);
        }

        return ResponseEntity.ok(operationService.findAll(req, page, size));
    }

    @PostMapping("/aml/{id}/decision")
    @Operation(summary = "Prendre une décision de conformité sur une opération suspendue")
    @PreAuthorize("hasAnyRole('AGENT_VALIDATION', 'ADMIN_INSTITUTION', 'ADMIN_PLATEFORME')")
    public ResponseEntity<OperationDto> decideAml(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body,
            @RequestHeader(name = "X-Validation-PIN", required = false) String pin,
            @AuthenticationPrincipal Jwt jwt) {
        validateUserPin(jwt, pin);
        String decision = body.get("decision");
        String commentaire = body.get("commentaire");
        return ResponseEntity.ok(operationService.decideAml(id, decision, commentaire,
                jwt.getSubject(), jwt.getClaimAsString("name"), extractInstitutionId(jwt)));
    }

    @GetMapping("/aml/sources")
    @Operation(summary = "Lister les sources de sanctions configurées")
    public ResponseEntity<List<com.microlinks.operation.entity.AmlSource>> getSources() {
        return ResponseEntity.ok(amlService.getAllSources());
    }

    @PostMapping("/aml/sources")
    @Operation(summary = "Créer une source de sanctions")
    @PreAuthorize("hasAnyRole('ADMIN_PLATEFORME', 'ADMIN_INSTITUTION')")
    public ResponseEntity<com.microlinks.operation.entity.AmlSource> saveSource(
            @RequestBody com.microlinks.operation.entity.AmlSource source) {
        return ResponseEntity.ok(amlService.saveSource(source));
    }

    @PutMapping("/aml/sources/{id}")
    @Operation(summary = "Mettre à jour une source de sanctions")
    @PreAuthorize("hasAnyRole('ADMIN_PLATEFORME', 'ADMIN_INSTITUTION')")
    public ResponseEntity<com.microlinks.operation.entity.AmlSource> updateSource(
            @PathVariable UUID id,
            @RequestBody com.microlinks.operation.entity.AmlSource source) {
        source.setId(id);
        return ResponseEntity.ok(amlService.saveSource(source));
    }

    @DeleteMapping("/aml/sources/{id}")
    @Operation(summary = "Supprimer une source de sanctions")
    @PreAuthorize("hasAnyRole('ADMIN_PLATEFORME', 'ADMIN_INSTITUTION')")
    public ResponseEntity<Map<String, String>> deleteSource(@PathVariable UUID id) {
        amlService.deleteSource(id);
        return ResponseEntity.ok(Map.of("message", "Source supprimée avec succès"));
    }

    /**
     * Valide le code PIN de sécurité de l'utilisateur connecté auprès du service d'institution.
     */
    private void validateUserPin(Jwt jwt, String pin) {
        if (pin == null || pin.isBlank()) {
            throw new com.microlinks.operation.exception.WorkflowException("Code PIN de validation obligatoire pour cette opération financière.");
        }
        boolean isValid = pinValidationClient.validatePin(jwt.getSubject(), pin);
        if (!isValid) {
            throw new com.microlinks.operation.exception.WorkflowException("Code PIN de validation incorrect.");
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
