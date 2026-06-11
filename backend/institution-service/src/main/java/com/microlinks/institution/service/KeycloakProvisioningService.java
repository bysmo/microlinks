package com.microlinks.institution.service;

import com.microlinks.institution.entity.Institution;
import com.microlinks.institution.entity.TypeInstitution;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import java.util.*;
import java.util.Set;

@Service
@Slf4j
public class KeycloakProvisioningService {

    @Value("${KEYCLOAK_URL:http://localhost:8443}")
    private String keycloakUrl;

    @Value("${KEYCLOAK_REALM:microlinks}")
    private String realm;

    @Value("${KEYCLOAK_ADMIN:admin}")
    private String adminUsername;

    @Value("${KEYCLOAK_ADMIN_PASSWORD:KeycloakAdmin@2024#}")
    private String adminPassword;

    private final RestClient restClient = RestClient.create();

    public void provisionUsersForInstitution(Institution institution) {
        log.info("Début de la création des utilisateurs Keycloak pour l'institution: {}", institution.getNom());
        try {
            String adminToken = getAdminToken();
            if (adminToken == null) {
                throw new RuntimeException("Impossible d'obtenir le jeton administrateur de Keycloak");
            }

            // S'assurer que les Protocol Mappers sont configurés pour inclure institution_id dans le JWT
            ensureProtocolMappers(adminToken);

            String cleanPrefix = (institution.getSigle() != null && !institution.getSigle().isBlank()
                    ? institution.getSigle() : institution.getCode())
                    .toLowerCase().replaceAll("[^a-z0-9]", "");

            String prefixCap = cleanPrefix.substring(0, 1).toUpperCase() + cleanPrefix.substring(1);

            boolean isBank = institution.getTypeInstitution() == TypeInstitution.BANQUE;

            // 1. Définir les profils
            UserProfile adminProfile = new UserProfile(
                    cleanPrefix + ".admin",
                    institution.getEmail(),
                    "Admin",
                    prefixCap,
                    prefixCap + "Admin@2026",
                    isBank ? "BANK_ADMIN" : "MESO_ADMIN",
                    institution.getTelephone()
            );

            UserProfile agentProfile = new UserProfile(
                    cleanPrefix + ".agent",
                    cleanPrefix + ".agent@microlinks.com",
                    "Agent",
                    prefixCap,
                    prefixCap + "Agent@2026",
                    isBank ? "BANK_AGENT" : "MESO_AGENT",
                    null
            );

            UserProfile validProfile = new UserProfile(
                    cleanPrefix + ".valid",
                    cleanPrefix + ".valid@microlinks.com",
                    "Validator",
                    prefixCap,
                    prefixCap + "Valid@2026",
                    isBank ? "BANK_VALID" : "MESO_VALID",
                    null
            );

            List<UserProfile> profiles = List.of(adminProfile, agentProfile, validProfile);

            for (UserProfile profile : profiles) {
                createAndAssignRole(adminToken, institution, profile);
            }
            log.info("Utilisateurs créés avec succès pour l'institution: {}", institution.getNom());
        } catch (Exception e) {
            log.error("Erreur lors du provisionnement Keycloak pour l'institution {}: {}", institution.getNom(), e.getMessage(), e);
            throw new RuntimeException("Erreur de provisionnement Keycloak: " + e.getMessage(), e);
        }
    }

    /**
     * S'assure que les Protocol Mappers existent dans le realm pour exposer
     * les attributs utilisateur (institution_id, institution_nom) dans le token JWT.
     * Ces mappers sont créés au niveau du realm (default client scopes) pour s'appliquer
     * à tous les clients.
     */
    @SuppressWarnings("unchecked")
    private void ensureProtocolMappers(String adminToken) {
        try {
            // Récupérer la liste des clients pour trouver le client frontend
            String clientsUrl = keycloakUrl + "/admin/realms/" + realm + "/clients";
            List<Map<String, Object>> clients = restClient.get()
                    .uri(clientsUrl + "?clientId=microlinks-frontend&max=1")
                    .header("Authorization", "Bearer " + adminToken)
                    .retrieve()
                    .body(List.class);

            if (clients == null || clients.isEmpty()) {
                log.warn("Client 'microlinks-frontend' non trouvé, tentative avec le realm par défaut");
                ensureRealmMappers(adminToken);
                return;
            }

            String clientId = (String) clients.get(0).get("id");
            String mappersUrl = keycloakUrl + "/admin/realms/" + realm + "/clients/" + clientId + "/protocol-mappers/models";

            // Récupérer les mappers existants
            List<Map<String, Object>> existingMappers = restClient.get()
                    .uri(mappersUrl)
                    .header("Authorization", "Bearer " + adminToken)
                    .retrieve()
                    .body(List.class);

            Set<String> existingMapperNames = new java.util.HashSet<>();
            if (existingMappers != null) {
                existingMappers.forEach(m -> existingMapperNames.add((String) m.get("name")));
            }

            // Créer les mappers manquants
            createAttributeMapper(adminToken, mappersUrl, existingMapperNames, "institution_id", "institution_id");
            createAttributeMapper(adminToken, mappersUrl, existingMapperNames, "institution_nom", "institution_nom");

        } catch (Exception e) {
            log.warn("Impossible de configurer les Protocol Mappers pour le client frontend: {}. Tentative au niveau realm.", e.getMessage());
            ensureRealmMappers(adminToken);
        }
    }

    @SuppressWarnings("unchecked")
    private void ensureRealmMappers(String adminToken) {
        try {
            // Chercher le scope "profile" ou créer des mappers directement au niveau realm
            String scopesUrl = keycloakUrl + "/admin/realms/" + realm + "/client-scopes";
            List<Map<String, Object>> scopes = restClient.get()
                    .uri(scopesUrl)
                    .header("Authorization", "Bearer " + adminToken)
                    .retrieve()
                    .body(List.class);

            if (scopes == null) return;

            // Trouver le scope "microlinks-institution" ou "profile"
            String scopeId = scopes.stream()
                    .filter(s -> "microlinks-institution".equals(s.get("name")) || "profile".equals(s.get("name")))
                    .map(s -> (String) s.get("id"))
                    .findFirst().orElse(null);

            if (scopeId == null) {
                log.warn("Aucun client scope approprié trouvé pour les Protocol Mappers");
                return;
            }

            String mappersUrl = keycloakUrl + "/admin/realms/" + realm + "/client-scopes/" + scopeId + "/protocol-mappers/models";

            List<Map<String, Object>> existingMappers = restClient.get()
                    .uri(mappersUrl)
                    .header("Authorization", "Bearer " + adminToken)
                    .retrieve()
                    .body(List.class);

            Set<String> existingMapperNames = new java.util.HashSet<>();
            if (existingMappers != null) {
                existingMappers.forEach(m -> existingMapperNames.add((String) m.get("name")));
            }

            createAttributeMapper(adminToken, mappersUrl, existingMapperNames, "institution_id", "institution_id");
            createAttributeMapper(adminToken, mappersUrl, existingMapperNames, "institution_nom", "institution_nom");

        } catch (Exception e) {
            log.error("Erreur lors de la configuration des mappers au niveau realm: {}", e.getMessage());
        }
    }

    private void createAttributeMapper(String adminToken, String mappersUrl,
                                        Set<String> existingNames, String mapperName, String attributeName) {
        if (existingNames.contains(mapperName)) {
            log.debug("Protocol Mapper '{}' existe déjà", mapperName);
            return;
        }
        try {
            Map<String, Object> mapper = new HashMap<>();
            mapper.put("name", mapperName);
            mapper.put("protocol", "openid-connect");
            mapper.put("protocolMapper", "oidc-usermodel-attribute-mapper");
            Map<String, String> config = new HashMap<>();
            config.put("user.attribute", attributeName);
            config.put("claim.name", attributeName);
            config.put("jsonType.label", "String");
            config.put("id.token.claim", "true");
            config.put("access.token.claim", "true");
            config.put("userinfo.token.claim", "true");
            config.put("multivalued", "false");
            mapper.put("config", config);

            restClient.post()
                    .uri(mappersUrl)
                    .header("Authorization", "Bearer " + adminToken)
                    .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                    .body(mapper)
                    .retrieve()
                    .toBodilessEntity();

            log.info("Protocol Mapper '{}' créé avec succès", mapperName);
        } catch (Exception e) {
            log.warn("Impossible de créer le Protocol Mapper '{}': {}", mapperName, e.getMessage());
        }
    }


    private void createAndAssignRole(String adminToken, Institution institution, UserProfile profile) {
        // A. Créer le user
        String userId = createUser(adminToken, institution, profile);
        if (userId == null) {
            log.warn("L'utilisateur {} existe déjà ou n'a pas pu être créé.", profile.username);
            return;
        }

        // B. Récupérer le role representation
        Map<String, Object> roleRep = getRoleRepresentation(adminToken, profile.roleName);
        if (roleRep == null) {
            log.error("Rôle {} introuvable dans Keycloak", profile.roleName);
            return;
        }

        // C. Assigner le rôle au user
        assignRoleToUser(adminToken, userId, roleRep);
    }

    private String getAdminToken() {
        try {
            String tokenUrl = keycloakUrl + "/realms/master/protocol/openid-connect/token";
            MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
            form.add("grant_type", "password");
            form.add("client_id", "admin-cli");
            form.add("username", adminUsername);
            form.add("password", adminPassword);

            @SuppressWarnings("unchecked")
            Map<String, Object> resp = restClient.post()
                    .uri(tokenUrl)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(Map.class);

            if (resp != null && resp.get("access_token") != null) {
                return (String) resp.get("access_token");
            }
        } catch (Exception e) {
            log.error("Erreur d'obtention de token Keycloak admin: {}", e.getMessage());
        }
        return null;
    }

    private String createUser(String adminToken, Institution institution, UserProfile profile) {
        String usersUrl = keycloakUrl + "/admin/realms/" + realm + "/users";

        Map<String, Object> userJson = new HashMap<>();
        userJson.put("username", profile.username);
        userJson.put("email", profile.email);
        userJson.put("enabled", true);
        userJson.put("emailVerified", true);
        userJson.put("firstName", profile.firstName);
        userJson.put("lastName", profile.lastName);

        Map<String, List<String>> attributes = new HashMap<>();
        attributes.put("institution_id", List.of(institution.getId().toString()));
        attributes.put("institution_nom", List.of(institution.getNom()));
        if (profile.phone != null && !profile.phone.isBlank()) {
            attributes.put("telephone", List.of(profile.phone));
        }
        userJson.put("attributes", attributes);

        Map<String, Object> credential = new HashMap<>();
        credential.put("type", "password");
        credential.put("value", profile.password);
        credential.put("temporary", false);
        userJson.put("credentials", List.of(credential));

        try {
            ResponseEntity<Void> response = restClient.post()
                    .uri(usersUrl)
                    .header("Authorization", "Bearer " + adminToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(userJson)
                    .retrieve()
                    .toBodilessEntity();

            if (response.getStatusCode().is2xxSuccessful()) {
                List<String> locationHeader = response.getHeaders().get("Location");
                if (locationHeader != null && !locationHeader.isEmpty()) {
                    String loc = locationHeader.get(0);
                    return loc.substring(loc.lastIndexOf("/") + 1);
                }
            }
        } catch (Exception e) {
            log.warn("Erreur lors de la création directe du user {} (déjà existant?) : {}", profile.username, e.getMessage());
        }

        // Fallback: chercher l'utilisateur pour récupérer son ID si déjà existant
        try {
            String searchUrl = usersUrl + "?username=" + profile.username;
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> users = restClient.get()
                    .uri(searchUrl)
                    .header("Authorization", "Bearer " + adminToken)
                    .retrieve()
                    .body(List.class);

            if (users != null && !users.isEmpty()) {
                String userId = (String) users.get(0).get("id");
                
                // Mettre à jour l'utilisateur existant avec les attributs et infos nécessaires
                String updateUrl = usersUrl + "/" + userId;
                Map<String, Object> updateJson = new HashMap<>(userJson);
                updateJson.remove("credentials"); // Ne pas écraser/renvoyer les credentials d'origine
                
                restClient.put()
                        .uri(updateUrl)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(updateJson)
                        .retrieve()
                        .toBodilessEntity();
                
                log.info("Attributs et profil mis à jour avec succès pour l'utilisateur existant: {}", profile.username);
                return userId;
            }
        } catch (Exception e) {
            log.error("Impossible de récupérer ou mettre à jour l'utilisateur {}", profile.username, e);
        }

        return null;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> getRoleRepresentation(String adminToken, String roleName) {
        String roleUrl = keycloakUrl + "/admin/realms/" + realm + "/roles/" + roleName;
        try {
            return restClient.get()
                    .uri(roleUrl)
                    .header("Authorization", "Bearer " + adminToken)
                    .retrieve()
                    .body(Map.class);
        } catch (Exception e) {
            log.error("Erreur de récupération du rôle {}: {}", roleName, e.getMessage());
        }
        return null;
    }

    private void assignRoleToUser(String adminToken, String userId, Map<String, Object> roleRep) {
        String mappingUrl = keycloakUrl + "/admin/realms/" + realm + "/users/" + userId + "/role-mappings/realm";
        try {
            restClient.post()
                    .uri(mappingUrl)
                    .header("Authorization", "Bearer " + adminToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(List.of(roleRep))
                    .retrieve()
                    .toBodilessEntity();
            log.info("Rôle {} assigné avec succès à l'utilisateur ID {}", roleRep.get("name"), userId);
        } catch (Exception e) {
            log.error("Erreur d'association du rôle à l'utilisateur: {}", e.getMessage());
        }
    }

    private record UserProfile(
            String username,
            String email,
            String firstName,
            String lastName,
            String password,
            String roleName,
            String phone
    ) {}
}
