package com.microlinks.billing.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import java.time.Instant;
import java.util.Map;

/**
 * Fournit un jeton d'accès "service account" via le flux client_credentials Keycloak,
 * pour les appels inter-services automatiques (job planifié sans utilisateur connecté).
 * Dégrade gracieusement si non configuré.
 */
@Component
@Slf4j
public class ServiceTokenProvider {

    @Value("${KEYCLOAK_URL:http://localhost:8443}")
    private String keycloakUrl;

    @Value("${KEYCLOAK_REALM:microlinks}")
    private String realm;

    @Value("${microlinks.service-account.client-id:billing-service}")
    private String clientId;

    @Value("${microlinks.service-account.client-secret:}")
    private String clientSecret;

    private final RestClient restClient = RestClient.create();
    private String cachedToken;
    private Instant expiresAt = Instant.EPOCH;

    public synchronized String getToken() {
        if (clientSecret == null || clientSecret.isBlank()) {
            log.debug("Service account non configuré (microlinks.service-account.client-secret vide).");
            return null;
        }
        if (cachedToken != null && Instant.now().isBefore(expiresAt.minusSeconds(30))) {
            return cachedToken;
        }
        try {
            String tokenUrl = keycloakUrl + "/realms/" + realm + "/protocol/openid-connect/token";
            MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
            form.add("grant_type", "client_credentials");
            form.add("client_id", clientId);
            form.add("client_secret", clientSecret);

            @SuppressWarnings("unchecked")
            Map<String, Object> resp = restClient.post()
                    .uri(tokenUrl)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(Map.class);

            if (resp != null && resp.get("access_token") != null) {
                cachedToken = (String) resp.get("access_token");
                int expiresIn = resp.get("expires_in") != null
                        ? ((Number) resp.get("expires_in")).intValue() : 60;
                expiresAt = Instant.now().plusSeconds(expiresIn);
                return cachedToken;
            }
        } catch (Exception e) {
            log.warn("Impossible d'obtenir un jeton service account: {}", e.getMessage());
        }
        return null;
    }
}
