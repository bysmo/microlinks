package com.microlinks.sftp.controller;

import com.microlinks.sftp.service.SftpCollectorService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Contrôleur REST pour le monitoring et le déclenchement manuel de la collecte SFTP.
 * Tous les endpoints sont réservés à l'ADMIN_PLATEFORME.
 */
@RestController
@RequestMapping("/api/v1/sftp")
@RequiredArgsConstructor
@Tag(name = "SFTP File Exchange", description = "Gestion des échanges de fichiers inter-institutions via SFTP")
@SecurityRequirement(name = "bearerAuth")
@Slf4j
public class SftpController {

    private final SftpCollectorService collectorService;

    @PostMapping("/collect/all")
    @Operation(summary = "Déclencher manuellement la collecte SFTP sur toutes les institutions",
               description = "Réservé ADMIN_PLATEFORME. Lance immédiatement un cycle de collecte complet.")
    @PreAuthorize("hasRole('ADMIN_PLATEFORME')")
    public ResponseEntity<CollectionResponse> collectAll() {
        log.info("Collecte SFTP manuelle déclenchée via API");
        SftpCollectorService.CollectionResult result = collectorService.collectAllInstitutions();
        return ResponseEntity.ok(new CollectionResponse(
                result.totalCollectes(),
                result.totalErreurs(),
                result.messages(),
                LocalDateTime.now()
        ));
    }

    @PostMapping("/collect/{institutionCode}")
    @Operation(summary = "Déclencher la collecte SFTP pour une institution spécifique",
               description = "Réservé ADMIN_PLATEFORME. Lance la collecte uniquement pour l'institution indiquée.")
    @PreAuthorize("hasRole('ADMIN_PLATEFORME')")
    public ResponseEntity<Map<String, Object>> collectForInstitution(
            @PathVariable String institutionCode) {
        log.info("Collecte SFTP manuelle déclenchée pour l'institution : {}", institutionCode);
        int nbCollectes = collectorService.collectForInstitutionByCode(institutionCode);
        return ResponseEntity.ok(Map.of(
                "institutionCode", institutionCode,
                "fichiersCollectes", nbCollectes,
                "timestamp", LocalDateTime.now().toString()
        ));
    }

    @GetMapping("/status")
    @Operation(summary = "Statut du service SFTP",
               description = "Retourne l'état du service et la configuration du planificateur.")
    @PreAuthorize("hasRole('ADMIN_PLATEFORME')")
    public ResponseEntity<Map<String, Object>> getStatus() {
        return ResponseEntity.ok(Map.of(
                "service", "sftp-service",
                "statut", "ACTIF",
                "timestamp", LocalDateTime.now().toString(),
                "description", "Service d'échange de fichiers SFTP entre institutions financières"
        ));
    }

    /** DTO de réponse pour une collecte */
    public record CollectionResponse(
            int fichiersCollectes,
            int erreurs,
            java.util.List<String> messages,
            LocalDateTime timestamp
    ) {}
}
