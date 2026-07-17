package com.microlinks.operation.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import java.util.Map;

/**
 * Client synchrone appelant le microservice institution-service pour
 * valider les codes PIN de sécurité des utilisateurs.
 */
@Component
@Slf4j
public class PinValidationClient {

    private final RestClient restClient;
    private final String institutionServiceUrl;

    public PinValidationClient(
            @Value("${INSTITUTION_SERVICE_URL:http://localhost:8082}") String institutionServiceUrl) {
        this.restClient = RestClient.create();
        this.institutionServiceUrl = institutionServiceUrl;
    }

    /**
     * Valide le code PIN d'un utilisateur auprès de institution-service.
     *
     * @param userId L'identifiant de l'utilisateur dans Keycloak.
     * @param pin Le code PIN à valider.
     * @return true si le PIN est valide, sinon false.
     */
    public boolean validatePin(String userId, String pin) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restClient.post()
                    .uri(institutionServiceUrl + "/api/v1/institutions/internal/users/" + userId + "/validate-pin?pin=" + pin)
                    .retrieve()
                    .body(Map.class);

            if (response != null && response.containsKey("valid")) {
                return (Boolean) response.get("valid");
            }
        } catch (Exception e) {
            log.error("Erreur de connexion au service d'institution pour validation du PIN de {}", userId, e);
        }
        return false;
    }
}
