package com.microlinks.sftp.client;

import com.microlinks.sftp.dto.InstitutionSftpInfoDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import java.util.List;

/**
 * Client REST vers l'institution-service pour récupérer les configurations SFTP
 * des institutions financières actives.
 *
 * Appelle l'endpoint interne /api/v1/institutions/sftp-configs (réservé service-to-service).
 * La communication reste dans le réseau Docker interne et n'est pas exposée via l'API Gateway.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class InstitutionSftpClient {

    private final WebClient.Builder webClientBuilder;

    @Value("${institution.service.url:http://institution-service:8082}")
    private String institutionServiceUrl;

    /**
     * Récupère toutes les institutions actives disposant d'une configuration SFTP complète.
     *
     * @return liste des configurations SFTP (credentials inclus, canal interne sécurisé)
     */
    public List<InstitutionSftpInfoDto> getAllActiveInstitutionsSftpConfig() {
        try {
            return webClientBuilder.build()
                    .get()
                    .uri(institutionServiceUrl + "/api/v1/institutions/internal/sftp-configs")
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<List<InstitutionSftpInfoDto>>() {})
                    .block();
        } catch (Exception e) {
            log.error("Erreur lors de la récupération des configs SFTP depuis institution-service", e);
            return List.of();
        }
    }

    /**
     * Récupère la configuration SFTP d'une institution spécifique par son code.
     */
    public InstitutionSftpInfoDto getInstitutionSftpConfigByCode(String code) {
        try {
            return webClientBuilder.build()
                    .get()
                    .uri(institutionServiceUrl + "/api/v1/institutions/internal/sftp-configs/" + code)
                    .retrieve()
                    .bodyToMono(InstitutionSftpInfoDto.class)
                    .block();
        } catch (Exception e) {
            log.error("Erreur lors de la récupération de la config SFTP pour l'institution {}", code, e);
            return null;
        }
    }

    /**
     * Enregistre un log de transfert SFTP dans l'institution-service.
     */
    public void saveTransferLog(com.microlinks.sftp.dto.SftpFileTransferDto logDto) {
        try {
            webClientBuilder.build()
                    .post()
                    .uri(institutionServiceUrl + "/api/v1/institutions/internal/sftp-transfers")
                    .bodyValue(logDto)
                    .retrieve()
                    .toBodilessEntity()
                    .block();
            log.debug("Log de transfert SFTP enregistré avec succès : {}", logDto.getNomFichier());
        } catch (Exception e) {
            log.error("Erreur lors de l'enregistrement du log de transfert SFTP pour {}", logDto.getNomFichier(), e);
        }
    }
}
