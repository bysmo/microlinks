package com.microlinks.billing.client;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import java.util.UUID;

/**
 * Client REST vers institution-service pour récupérer les informations
 * d'institution et déclencher la désactivation automatique.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class InstitutionClient {

    @Value("${INSTITUTION_SERVICE_URL:http://localhost:8082}")
    private String institutionServiceUrl;

    private final ServiceTokenProvider tokenProvider;
    private final RestClient restClient = RestClient.create();

    /**
     * Désactive une institution (statut INACTIF) via institution-service.
     * @return true si l'appel a réussi.
     */
    public boolean desactiverInstitution(UUID institutionId) {
        String token = tokenProvider.getToken();
        if (token == null) {
            log.warn("Désactivation institution {} ignorée: pas de jeton service account configuré.", institutionId);
            return false;
        }
        try {
            String url = institutionServiceUrl + "/api/v1/institutions/" + institutionId + "/statut?statut=INACTIF";
            restClient.patch()
                    .uri(url)
                    .header("Authorization", "Bearer " + token)
                    .retrieve()
                    .toBodilessEntity();
            log.info("Institution {} désactivée pour cause d'impayé.", institutionId);
            return true;
        } catch (Exception e) {
            log.warn("Échec désactivation institution {}: {}", institutionId, e.getMessage());
            return false;
        }
    }
}
