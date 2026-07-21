package com.microlinks.sftp.client;

import com.microlinks.sftp.dto.OperationDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class OperationClient {

    private final WebClient.Builder webClientBuilder;

    @Value("${operation.service.url:http://operation-service:8083}")
    private String operationServiceUrl;

    /**
     * Récupère la liste des opérations en attente de transmission (statut ACCEPTE_BANQUE_EMETTRICE).
     */
    public List<OperationDto> getOperationsToTransmit() {
        try {
            return webClientBuilder.build()
                    .get()
                    .uri(operationServiceUrl + "/api/v1/operations/internal/to-transmit")
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<List<OperationDto>>() {})
                    .block();
        } catch (Exception e) {
            log.error("Erreur lors de la récupération des opérations à transmettre", e);
            return List.of();
        }
    }

    /**
     * Met à jour le statut d'une liste d'opérations.
     */
    public void updateOperationsStatus(List<UUID> ids, String nouveauStatut) {
        try {
            webClientBuilder.build()
                    .put()
                    .uri(uriBuilder -> uriBuilder
                            .scheme("http")
                            .host("operation-service")
                            .port(8083)
                            .path("/api/v1/operations/internal/status")
                            .queryParam("nouveauStatut", nouveauStatut)
                            .build())
                    .bodyValue(ids)
                    .retrieve()
                    .toBodilessEntity()
                    .block();
            log.info("Mise à jour réussie du statut des opérations vers {}", nouveauStatut);
        } catch (Exception e) {
            log.error("Erreur lors de la mise à jour du statut des opérations vers {}", nouveauStatut, e);
            throw new RuntimeException("Échec de la mise à jour des statuts des opérations", e);
        }
    }
}
