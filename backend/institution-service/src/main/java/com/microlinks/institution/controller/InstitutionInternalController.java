package com.microlinks.institution.controller;

import com.microlinks.institution.dto.InstitutionSftpInternalDto;
import com.microlinks.institution.entity.Institution;
import com.microlinks.institution.entity.StatutEntite;
import com.microlinks.institution.exception.ResourceNotFoundException;
import com.microlinks.institution.repository.InstitutionRepository;
import io.swagger.v3.oas.annotations.Hidden;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Contrôleur interne pour les échanges service-à-service.
 *
 * ATTENTION : Ces endpoints exposent les credentials SFTP en clair.
 * Ils ne doivent JAMAIS être accessibles via l'API Gateway.
 * L'accès est limité au réseau interne Docker (pas d'authentification JWT
 * requise car le réseau est isolé, mais le port du service n'est pas publié).
 *
 * @Hidden : exclu de la documentation Swagger publique.
 */
@RestController
@RequestMapping("/api/v1/institutions/internal")
@RequiredArgsConstructor
@Slf4j
@Hidden
public class InstitutionInternalController {

    private final InstitutionRepository institutionRepository;
    private final com.microlinks.institution.service.KeycloakProvisioningService keycloakProvisioningService;

    /**
     * Valide le code PIN d'un collaborateur interne.
     * Consommé par les autres microservices (operation-service, billing-service).
     */
    @PostMapping("/users/{userId}/validate-pin")
    public ResponseEntity<java.util.Map<String, Boolean>> validatePin(
            @PathVariable String userId,
            @RequestParam String pin) {
        boolean isValid = keycloakProvisioningService.validateUserPin(userId, pin);
        return ResponseEntity.ok(java.util.Map.of("valid", isValid));
    }

    /**
     * Retourne les configurations SFTP complètes (avec credentials déchiffrés)
     * de toutes les institutions actives ayant une config SFTP définie.
     *
     * Consommé par le sftp-service uniquement.
     */
    @GetMapping("/sftp-configs")
    public ResponseEntity<List<InstitutionSftpInternalDto>> getAllSftpConfigs() {
        List<Institution> actives = institutionRepository.findByStatut(StatutEntite.ACTIF,
                org.springframework.data.domain.Pageable.unpaged()).getContent();

        List<InstitutionSftpInternalDto> configs = actives.stream()
                .filter(i -> i.getSftpHost() != null && !i.getSftpHost().isBlank())
                .map(this::toInternalDto)
                .collect(Collectors.toList());

        log.debug("Retour de {} config(s) SFTP au sftp-service", configs.size());
        return ResponseEntity.ok(configs);
    }

    /**
     * Retourne la configuration SFTP d'une institution par son code.
     */
    @GetMapping("/sftp-configs/{code}")
    public ResponseEntity<InstitutionSftpInternalDto> getSftpConfigByCode(@PathVariable String code) {
        Institution institution = institutionRepository.findByCode(code.toUpperCase())
                .orElseThrow(() -> new ResourceNotFoundException("Institution introuvable : " + code));
        return ResponseEntity.ok(toInternalDto(institution));
    }

    private InstitutionSftpInternalDto toInternalDto(Institution i) {
        InstitutionSftpInternalDto dto = new InstitutionSftpInternalDto();
        dto.setInstitutionId(i.getId());
        dto.setInstitutionCode(i.getCode());
        dto.setInstitutionNom(i.getNom());
        dto.setSftpHost(i.getSftpHost());
        dto.setSftpPort(i.getSftpPort());
        dto.setSftpUser(i.getSftpUser());
        // Credentials en clair (déchiffrés automatiquement par le @Convert JPA)
        dto.setSftpPassword(i.getSftpPassword());
        dto.setSftpPrivateKey(i.getSftpPrivateKey());
        dto.setSftpRepertoireEnvoi(i.getSftpRepertoireEnvoi());
        dto.setSftpRepertoireReception(i.getSftpRepertoireReception());
        dto.setSftpRepertoireArchivage(i.getSftpRepertoireArchivage());
        dto.setProtocoleActif(i.getProtocoleActif());
        
        dto.setProtocoleEntree(i.getProtocoleEntree());
        dto.setTypeFichierEntree(i.getTypeFichierEntree());
        dto.setRepertoireEntree(i.getRepertoireEntree());
        dto.setUtilisateurEntree(i.getUtilisateurEntree());
        dto.setPortEntree(i.getPortEntree());
        dto.setMotDePasseEntree(i.getMotDePasseEntree());

        dto.setProtocoleSortie(i.getProtocoleSortie());
        dto.setTypeFichierSortie(i.getTypeFichierSortie());
        dto.setRepertoireSortie(i.getRepertoireSortie());
        dto.setUtilisateurSortie(i.getUtilisateurSortie());
        dto.setPortSortie(i.getPortSortie());
        dto.setMotDePasseSortie(i.getMotDePasseSortie());

        dto.setTypesFichiersEnvoi(i.getTypesFichiersEnvoi());
        dto.setTypesFichiersReception(i.getTypesFichiersReception());
        dto.setSftpNotificationActive(i.getSftpNotificationActive());
        dto.setSftpEmailsNotification(i.getSftpEmailsNotification());
        return dto;
    }
}
