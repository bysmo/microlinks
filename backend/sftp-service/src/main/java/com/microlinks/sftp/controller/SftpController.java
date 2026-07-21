package com.microlinks.sftp.controller;

import com.microlinks.sftp.service.SftpCollectorService;
import com.microlinks.sftp.service.SftpConnectionService;
import com.microlinks.sftp.dto.InstitutionSftpInfoDto;
import com.jcraft.jsch.ChannelSftp;
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
import java.util.List;
import java.util.HashMap;
import java.util.ArrayList;

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
    private final SftpConnectionService connectionService;
    private final com.microlinks.sftp.client.InstitutionSftpClient institutionClient;
    private final org.springframework.web.reactive.function.client.WebClient.Builder webClientBuilder;

    @org.springframework.beans.factory.annotation.Value("${institution.service.url:http://institution-service:8082}")
    private String institutionServiceUrl;

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

    @GetMapping("/connections")
    @PreAuthorize("hasRole('ADMIN_PLATEFORME')")
    @Operation(summary = "Lister l'état des connexions SFTP de toutes les institutions")
    public ResponseEntity<List<Map<String, Object>>> getConnectionsStatus() {
        List<InstitutionSftpInfoDto> institutions = institutionClient.getAllActiveInstitutionsSftpConfig();
        List<Map<String, Object>> result = new ArrayList<>();

        for (InstitutionSftpInfoDto inst : institutions) {
            Map<String, Object> instStatus = new HashMap<>();
            instStatus.put("institutionId", inst.getInstitutionId());
            instStatus.put("institutionCode", inst.getInstitutionCode());
            instStatus.put("institutionNom", inst.getInstitutionNom());
            instStatus.put("protocoleActif", inst.getProtocoleActif() != null ? inst.getProtocoleActif() : false);
            
            // Sens ENTRÉE diagnostic
            boolean connectionEntreeOk = false;
            String entreeError = null;
            if (inst.isConfigurationComplete()) {
                ChannelSftp channel = null;
                try {
                    InstitutionSftpInfoDto connConfig = new InstitutionSftpInfoDto();
                    connConfig.setInstitutionCode(inst.getInstitutionCode());
                    connConfig.setSftpHost(inst.getSftpHost());
                    connConfig.setSftpPort(inst.getPortEntree() != null ? inst.getPortEntree() : (inst.getSftpPort() != null ? inst.getSftpPort() : 22));
                    connConfig.setSftpUser(inst.getUtilisateurEntree() != null ? inst.getUtilisateurEntree() : inst.getSftpUser());
                    connConfig.setSftpPassword(inst.getMotDePasseEntree() != null ? inst.getMotDePasseEntree() : inst.getSftpPassword());
                    connConfig.setSftpPrivateKey(inst.getSftpPrivateKey());

                    channel = connectionService.openSftpChannel(connConfig);
                    connectionEntreeOk = true;
                } catch (Exception e) {
                    entreeError = e.getMessage();
                } finally {
                    if (channel != null) connectionService.closeSftpChannel(channel);
                }
            }
            
            // Sens SORTIE diagnostic
            boolean connectionSortieOk = false;
            String sortieError = null;
            if (inst.isConfigurationComplete()) {
                ChannelSftp channel = null;
                try {
                    InstitutionSftpInfoDto connConfig = new InstitutionSftpInfoDto();
                    connConfig.setInstitutionCode(inst.getInstitutionCode());
                    connConfig.setSftpHost(inst.getSftpHost());
                    connConfig.setSftpPort(inst.getPortSortie() != null ? inst.getPortSortie() : (inst.getSftpPort() != null ? inst.getSftpPort() : 22));
                    connConfig.setSftpUser(inst.getUtilisateurSortie() != null ? inst.getUtilisateurSortie() : inst.getSftpUser());
                    connConfig.setSftpPassword(inst.getMotDePasseSortie() != null ? inst.getMotDePasseSortie() : inst.getSftpPassword());
                    connConfig.setSftpPrivateKey(inst.getSftpPrivateKey());

                    channel = connectionService.openSftpChannel(connConfig);
                    connectionSortieOk = true;
                } catch (Exception e) {
                    sortieError = e.getMessage();
                } finally {
                    if (channel != null) connectionService.closeSftpChannel(channel);
                }
            }

            instStatus.put("statusEntree", connectionEntreeOk ? "ACTIVE" : (Boolean.TRUE.equals(inst.getProtocoleActif()) ? "ERREUR" : "INACTIF"));
            instStatus.put("erreurEntree", entreeError);
            instStatus.put("statusSortie", connectionSortieOk ? "ACTIVE" : (Boolean.TRUE.equals(inst.getProtocoleActif()) ? "ERREUR" : "INACTIF"));
            instStatus.put("erreurSortie", sortieError);
            
            result.add(instStatus);
        }

        return ResponseEntity.ok(result);
    }

    @PostMapping("/connections/test/{institutionCode}/{sens}")
    @PreAuthorize("hasRole('ADMIN_PLATEFORME')")
    @Operation(summary = "Tester la connexion SFTP pour une institution spécifique")
    public ResponseEntity<Map<String, Object>> testConnection(
            @PathVariable String institutionCode,
            @PathVariable String sens) {
        log.info("Test de connexion SFTP manuel demandé pour {} ({})", institutionCode, sens);
        InstitutionSftpInfoDto inst = institutionClient.getInstitutionSftpConfigByCode(institutionCode);
        if (inst == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Institution introuvable ou configuration SFTP absente."));
        }

        ChannelSftp channel = null;
        try {
            InstitutionSftpInfoDto connConfig = new InstitutionSftpInfoDto();
            connConfig.setInstitutionCode(inst.getInstitutionCode());
            connConfig.setSftpHost(inst.getSftpHost());
            
            String rep;
            if ("ENTREE".equalsIgnoreCase(sens)) {
                connConfig.setSftpPort(inst.getPortEntree() != null ? inst.getPortEntree() : (inst.getSftpPort() != null ? inst.getSftpPort() : 22));
                connConfig.setSftpUser(inst.getUtilisateurEntree() != null ? inst.getUtilisateurEntree() : inst.getSftpUser());
                connConfig.setSftpPassword(inst.getMotDePasseEntree() != null ? inst.getMotDePasseEntree() : inst.getSftpPassword());
                connConfig.setSftpPrivateKey(inst.getSftpPrivateKey());
                rep = inst.getRepertoireEntree() != null ? inst.getRepertoireEntree() : inst.getSftpRepertoireReception();
            } else {
                connConfig.setSftpPort(inst.getPortSortie() != null ? inst.getPortSortie() : (inst.getSftpPort() != null ? inst.getSftpPort() : 22));
                connConfig.setSftpUser(inst.getUtilisateurSortie() != null ? inst.getUtilisateurSortie() : inst.getSftpUser());
                connConfig.setSftpPassword(inst.getMotDePasseSortie() != null ? inst.getMotDePasseSortie() : inst.getSftpPassword());
                connConfig.setSftpPrivateKey(inst.getSftpPrivateKey());
                rep = inst.getRepertoireSortie() != null ? inst.getRepertoireSortie() : inst.getSftpRepertoireEnvoi();
            }

            channel = connectionService.openSftpChannel(connConfig);
            if (rep != null && !rep.isBlank()) {
                channel.ls(rep);
            }
            return ResponseEntity.ok(Map.of("success", true, "message", "Connexion SFTP et accès répertoire réussis !"));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("success", false, "message", e.getMessage()));
        } finally {
            if (channel != null) connectionService.closeSftpChannel(channel);
        }
    }

    @GetMapping("/transfers")
    @PreAuthorize("hasRole('ADMIN_PLATEFORME')")
    @Operation(summary = "Lister l'historique des transferts SFTP")
    public ResponseEntity<?> getTransfers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        try {
            Object response = webClientBuilder.build()
                    .get()
                    .uri(institutionServiceUrl + "/api/v1/institutions/internal/sftp-transfers?page=" + page + "&size=" + size)
                    .retrieve()
                    .bodyToMono(Object.class)
                    .block();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Erreur lors de la récupération de l'historique des transferts", e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/transfers/stats")
    @PreAuthorize("hasRole('ADMIN_PLATEFORME')")
    @Operation(summary = "Obtenir les statistiques des transferts SFTP")
    public ResponseEntity<?> getTransfersStats() {
        try {
            Object response = webClientBuilder.build()
                    .get()
                    .uri(institutionServiceUrl + "/api/v1/institutions/internal/sftp-transfers/stats")
                    .retrieve()
                    .bodyToMono(Object.class)
                    .block();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Erreur lors de la récupération des statistiques de transferts", e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    /** DTO de réponse pour une collecte */
    public record CollectionResponse(
            int fichiersCollectes,
            int erreurs,
            java.util.List<String> messages,
            LocalDateTime timestamp
    ) {}
}
