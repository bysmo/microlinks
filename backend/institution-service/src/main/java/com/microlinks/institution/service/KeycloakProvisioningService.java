package com.microlinks.institution.service;

import com.microlinks.institution.dto.UserDto;
import com.microlinks.institution.dto.UserCreateRequest;
import com.microlinks.institution.dto.UserUpdateRequest;
import com.microlinks.institution.entity.Institution;
import com.microlinks.institution.entity.TypeInstitution;
import com.microlinks.institution.exception.BusinessException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
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

    @Value("${microlinks.rabbitmq.exchange:microlinks.operations.exchange}")
    private String operationsExchange;

    private final RabbitTemplate rabbitTemplate;
    private final RestClient restClient = RestClient.create();

    public KeycloakProvisioningService(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

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

    @SuppressWarnings("unchecked")
    public List<UserDto> getUsersForInstitution(UUID institutionId) {
        String adminToken = getAdminToken();
        if (adminToken == null) {
            throw new RuntimeException("Impossible d'obtenir le jeton administrateur de Keycloak");
        }

        String searchUrl = keycloakUrl + "/admin/realms/" + realm + "/users?q=institution_id:" + institutionId + "&max=100";
        try {
            List<Map<String, Object>> users = restClient.get()
                    .uri(searchUrl)
                    .header("Authorization", "Bearer " + adminToken)
                    .retrieve()
                    .body(List.class);

            if (users == null) {
                return Collections.emptyList();
            }

            List<UserDto> result = new ArrayList<>();
            for (Map<String, Object> u : users) {
                Map<String, List<String>> attributes = (Map<String, List<String>>) u.get("attributes");
                if (attributes == null) continue;
                
                List<String> instIds = attributes.get("institution_id");
                if (instIds == null || !instIds.contains(institutionId.toString())) {
                    continue; // Double filtrage de sécurité en Java
                }

                String userId = (String) u.get("id");
                String username = (String) u.get("username");
                String email = (String) u.get("email");
                String firstName = (String) u.get("firstName");
                String lastName = (String) u.get("lastName");
                Boolean enabled = (Boolean) u.get("enabled");

                String phone = null;
                if (attributes.containsKey("telephone")) {
                    List<String> phones = attributes.get("telephone");
                    if (phones != null && !phones.isEmpty()) {
                        phone = phones.get(0);
                    }
                }

                String gender = null;
                if (attributes.containsKey("gender")) {
                    List<String> genders = attributes.get("gender");
                    if (genders != null && !genders.isEmpty()) {
                        gender = genders.get(0);
                    }
                }

                String role = getUserRole(adminToken, userId);

                UserDto dto = new UserDto();
                dto.setId(userId);
                dto.setUsername(username);
                dto.setEmail(email);
                dto.setFirstName(firstName);
                dto.setLastName(lastName);
                dto.setPhone(phone);
                dto.setGender(gender);
                dto.setRole(role);
                dto.setEnabled(enabled != null && enabled);
                dto.setInstitutionId(institutionId);
                result.add(dto);
            }
            return result;
        } catch (Exception e) {
            log.error("Erreur lors de la récupération des utilisateurs de l'institution {}: {}", institutionId, e.getMessage(), e);
            throw new RuntimeException("Erreur de récupération des utilisateurs Keycloak : " + e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    private String getUserRole(String adminToken, String userId) {
        String rolesUrl = keycloakUrl + "/admin/realms/" + realm + "/users/" + userId + "/role-mappings/realm";
        try {
            List<Map<String, Object>> roles = restClient.get()
                    .uri(rolesUrl)
                    .header("Authorization", "Bearer " + adminToken)
                    .retrieve()
                    .body(List.class);

            if (roles != null) {
                for (Map<String, Object> r : roles) {
                    String roleName = (String) r.get("name");
                    if ("BANK_ADMIN".equals(roleName) || "MESO_ADMIN".equals(roleName)) {
                        return "ADMIN";
                    } else if ("BANK_AGENT".equals(roleName) || "MESO_AGENT".equals(roleName)) {
                        return "AGENT";
                    } else if ("BANK_VALID".equals(roleName) || "MESO_VALID".equals(roleName)) {
                        return "VALID";
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Erreur récupération rôles pour l'utilisateur {}: {}", userId, e.getMessage());
        }
        return "LECTEUR";
    }

    public UserDto createUserForInstitution(Institution institution, UserCreateRequest request, String currentUser) {
        String adminToken = getAdminToken();
        if (adminToken == null) {
            throw new RuntimeException("Impossible d'obtenir le jeton administrateur de Keycloak");
        }

        String usersUrl = keycloakUrl + "/admin/realms/" + realm + "/users";

        // Vérifier l'unicité de l'identifiant
        try {
            List<?> existingUsers = restClient.get()
                    .uri(usersUrl + "?username=" + request.getUsername().toLowerCase())
                    .header("Authorization", "Bearer " + adminToken)
                    .retrieve()
                    .body(List.class);
            if (existingUsers != null && !existingUsers.isEmpty()) {
                throw new BusinessException("Ce nom d'utilisateur est déjà utilisé.");
            }

            // Vérifier l'unicité de l'adresse email
            existingUsers = restClient.get()
                    .uri(usersUrl + "?email=" + request.getEmail())
                    .header("Authorization", "Bearer " + adminToken)
                    .retrieve()
                    .body(List.class);
            if (existingUsers != null && !existingUsers.isEmpty()) {
                throw new BusinessException("Cette adresse email est déjà utilisée.");
            }
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Erreur vérification unicité Keycloak: {}", e.getMessage());
        }

        boolean isBank = institution.getTypeInstitution() == TypeInstitution.BANQUE;
        String roleName;
        if ("AGENT".equalsIgnoreCase(request.getRole())) {
            roleName = isBank ? "BANK_AGENT" : "MESO_AGENT";
        } else if ("VALID".equalsIgnoreCase(request.getRole())) {
            roleName = isBank ? "BANK_VALID" : "MESO_VALID";
        } else {
            throw new BusinessException("Le rôle doit être AGENT ou VALID.");
        }

        String tempPassword = generateTemporaryPassword();

        Map<String, Object> userJson = new HashMap<>();
        userJson.put("username", request.getUsername().toLowerCase());
        userJson.put("email", request.getEmail());
        userJson.put("enabled", true);
        userJson.put("emailVerified", true);
        userJson.put("firstName", request.getFirstName());
        userJson.put("lastName", request.getLastName());

        Map<String, List<String>> attributes = new HashMap<>();
        attributes.put("institution_id", List.of(institution.getId().toString()));
        attributes.put("institution_nom", List.of(institution.getNom()));
        if (request.getPhone() != null && !request.getPhone().isBlank()) {
            attributes.put("telephone", List.of(request.getPhone()));
        }
        if (request.getPin() != null && !request.getPin().isBlank()) {
            attributes.put("security_pin", List.of(hashPin(request.getPin())));
        }
        userJson.put("attributes", attributes);

        Map<String, Object> credential = new HashMap<>();
        credential.put("type", "password");
        credential.put("value", tempPassword);
        credential.put("temporary", true);
        userJson.put("credentials", List.of(credential));

        String userId;
        try {
            ResponseEntity<Void> response = restClient.post()
                    .uri(usersUrl)
                    .header("Authorization", "Bearer " + adminToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(userJson)
                    .retrieve()
                    .toBodilessEntity();

            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new RuntimeException("Erreur de création de l'utilisateur Keycloak : " + response.getStatusCode());
            }

            List<String> locationHeader = response.getHeaders().get("Location");
            if (locationHeader == null || locationHeader.isEmpty()) {
                throw new RuntimeException("Aucun ID utilisateur retourné par Keycloak");
            }
            String loc = locationHeader.get(0);
            userId = loc.substring(loc.lastIndexOf("/") + 1);
        } catch (Exception e) {
            log.error("Erreur lors de la création de l'utilisateur {} dans Keycloak: {}", request.getUsername(), e.getMessage(), e);
            throw new RuntimeException("Erreur de création Keycloak: " + e.getMessage());
        }

        // Assigner le rôle
        Map<String, Object> roleRep = getRoleRepresentation(adminToken, roleName);
        if (roleRep == null) {
            throw new RuntimeException("Rôle " + roleName + " introuvable dans Keycloak");
        }
        assignRoleToUser(adminToken, userId, roleRep);

        // Publier l'événement RabbitMQ pour l'email
        publishUserCreatedEvent(institution, request, tempPassword);

        UserDto dto = new UserDto();
        dto.setId(userId);
        dto.setUsername(request.getUsername().toLowerCase());
        dto.setEmail(request.getEmail());
        dto.setFirstName(request.getFirstName());
        dto.setLastName(request.getLastName());
        dto.setPhone(request.getPhone());
        dto.setRole(request.getRole().toUpperCase());
        dto.setEnabled(true);
        dto.setInstitutionId(institution.getId());

        return dto;
    }

    public void updateUserProfile(String userId, UserUpdateRequest request) {
        String adminToken = getAdminToken();
        if (adminToken == null) {
            throw new RuntimeException("Impossible d'obtenir le jeton administrateur de Keycloak");
        }

        String userUrl = keycloakUrl + "/admin/realms/" + realm + "/users/" + userId;
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> user = restClient.get()
                    .uri(userUrl)
                    .header("Authorization", "Bearer " + adminToken)
                    .retrieve()
                    .body(Map.class);

            if (user == null) {
                throw new RuntimeException("Utilisateur non trouvé dans Keycloak : " + userId);
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> attributes = user.containsKey("attributes")
                    ? new HashMap<>((Map<String, Object>) user.get("attributes"))
                    : new HashMap<>();

            if (request.getPhone() != null) {
                attributes.put("telephone", List.of(request.getPhone()));
            }
            if (request.getGenre() != null) {
                attributes.put("gender", List.of(request.getGenre()));
            }

            Map<String, Object> updateJson = new HashMap<>(user);
            updateJson.put("firstName", request.getFirstName());
            updateJson.put("lastName", request.getLastName());
            updateJson.put("attributes", attributes);

            // Éviter les clés problématiques que Keycloak rejette lors d'un PUT
            updateJson.remove("credentials");
            updateJson.remove("access");

            restClient.put()
                    .uri(userUrl)
                    .header("Authorization", "Bearer " + adminToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(updateJson)
                    .retrieve()
                    .toBodilessEntity();
            log.info("Profil de l'utilisateur Keycloak {} mis à jour avec succès", userId);
        } catch (Exception e) {
            log.error("Erreur de mise à jour du profil de l'utilisateur ID {}: {}", userId, e.getMessage(), e);
            throw new RuntimeException("Erreur de mise à jour du profil Keycloak: " + e.getMessage());
        }
    }

    public void updateUserPassword(String userId, String username, String currentPassword, String newPassword) {
        // 1. Valider l'ancien mot de passe en tentant une authentification directe
        String tokenUrl = keycloakUrl + "/realms/" + realm + "/protocol/openid-connect/token";
        try {
            MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
            form.add("grant_type", "password");
            form.add("client_id", "admin-cli");
            form.add("username", username);
            form.add("password", currentPassword);

            restClient.post()
                    .uri(tokenUrl)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception e) {
            log.warn("Échec de validation de l'ancien mot de passe pour {}: {}", username, e.getMessage());
            throw new BusinessException("Le mot de passe actuel est incorrect");
        }

        // 2. Mettre à jour avec le nouveau mot de passe
        String adminToken = getAdminToken();
        if (adminToken == null) {
            throw new RuntimeException("Impossible d'obtenir le jeton administrateur de Keycloak");
        }

        String resetPasswordUrl = keycloakUrl + "/admin/realms/" + realm + "/users/" + userId + "/reset-password";
        Map<String, Object> credential = new HashMap<>();
        credential.put("type", "password");
        credential.put("value", newPassword);
        credential.put("temporary", false);

        try {
            restClient.put()
                    .uri(resetPasswordUrl)
                    .header("Authorization", "Bearer " + adminToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(credential)
                    .retrieve()
                    .toBodilessEntity();
            log.info("Mot de passe mis à jour avec succès pour l'utilisateur ID {}", userId);
        } catch (Exception e) {
            log.error("Erreur de mise à jour du mot de passe Keycloak pour l'utilisateur ID {}: {}", userId, e.getMessage(), e);
            throw new RuntimeException("Erreur lors de la mise à jour du mot de passe : " + e.getMessage());
        }
    }

    public void updateUserStatus(String userId, boolean enabled) {
        String adminToken = getAdminToken();
        if (adminToken == null) {
            throw new RuntimeException("Impossible d'obtenir le jeton administrateur de Keycloak");
        }

        String userUrl = keycloakUrl + "/admin/realms/" + realm + "/users/" + userId;
        Map<String, Object> updateJson = new HashMap<>();
        updateJson.put("enabled", enabled);

        try {
            restClient.put()
                    .uri(userUrl)
                    .header("Authorization", "Bearer " + adminToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(updateJson)
                    .retrieve()
                    .toBodilessEntity();
            log.info("Statut de l'utilisateur Keycloak {} mis à jour: enabled={}", userId, enabled);
        } catch (Exception e) {
            log.error("Erreur de mise à jour du statut Keycloak pour l'utilisateur ID {}: {}", userId, e.getMessage(), e);
            throw new RuntimeException("Erreur de mise à jour du statut Keycloak: " + e.getMessage());
        }
    }

    private String generateTemporaryPassword() {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
        java.security.SecureRandom random = new java.security.SecureRandom();
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 10; i++) {
            sb.append(chars.charAt(random.nextInt(chars.length())));
        }
        return sb.toString() + "A1!";
    }

    /**
     * Valide le code PIN d'un utilisateur Keycloak.
     *
     * @param userId L'identifiant de l'utilisateur Keycloak.
     * @param rawPin Le code PIN en clair fourni par l'utilisateur.
     * @return true si le code PIN correspond au code enregistré, sinon false.
     */
    public boolean validateUserPin(String userId, String rawPin) {
        String adminToken = getAdminToken();
        if (adminToken == null) {
            log.error("Impossible de valider le PIN : jeton admin Keycloak non disponible");
            return false;
        }

        String userUrl = keycloakUrl + "/admin/realms/" + realm + "/users/" + userId;
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> user = restClient.get()
                    .uri(userUrl)
                    .header("Authorization", "Bearer " + adminToken)
                    .retrieve()
                    .body(Map.class);

            if (user != null && user.containsKey("attributes")) {
                @SuppressWarnings("unchecked")
                Map<String, List<String>> attributes = (Map<String, List<String>>) user.get("attributes");
                if (attributes != null && attributes.containsKey("security_pin")) {
                    List<String> pins = attributes.get("security_pin");
                    if (pins != null && !pins.isEmpty()) {
                        String storedHashedPin = pins.get(0);
                        String hashedInput = hashPin(rawPin);
                        return storedHashedPin.equals(hashedInput);
                    }
                }
            }
        } catch (Exception e) {
            log.error("Erreur lors de la validation du code PIN de l'utilisateur {} dans Keycloak", userId, e);
        }
        return false;
    }

    /**
     * Met à jour le code PIN d'un utilisateur Keycloak.
     *
     * @param userId L'identifiant de l'utilisateur Keycloak.
     * @param rawPin Le nouveau code PIN en clair.
     */
    public void updateUserPin(String userId, String rawPin) {
        String adminToken = getAdminToken();
        if (adminToken == null) {
            throw new RuntimeException("Impossible d'obtenir le jeton administrateur de Keycloak");
        }

        String userUrl = keycloakUrl + "/admin/realms/" + realm + "/users/" + userId;
        try {
            // Récupérer l'utilisateur pour préserver ses attributs existants
            @SuppressWarnings("unchecked")
            Map<String, Object> user = restClient.get()
                    .uri(userUrl)
                    .header("Authorization", "Bearer " + adminToken)
                    .retrieve()
                    .body(Map.class);

            if (user == null) {
                throw new RuntimeException("Utilisateur non trouvé dans Keycloak : " + userId);
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> attributes = user.containsKey("attributes") 
                ? new HashMap<>((Map<String, Object>) user.get("attributes")) 
                : new HashMap<>();

            attributes.put("security_pin", List.of(hashPin(rawPin)));

            Map<String, Object> updateJson = new HashMap<>(user);
            updateJson.put("attributes", attributes);
            
            updateJson.remove("credentials");
            updateJson.remove("access");

            restClient.put()
                    .uri(userUrl)
                    .header("Authorization", "Bearer " + adminToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(updateJson)
                    .retrieve()
                    .toBodilessEntity();
            log.info("Code PIN de l'utilisateur Keycloak {} mis à jour avec succès", userId);
        } catch (Exception e) {
            log.error("Erreur lors de la mise à jour du code PIN de l'utilisateur ID {}: {}", userId, e.getMessage(), e);
            throw new RuntimeException("Erreur de mise à jour du code PIN Keycloak : " + e.getMessage());
        }
    }

    /**
     * Hache le code PIN à l'aide de SHA-256.
     *
     * @param pin Le code PIN brut.
     * @return La chaîne hexadécimale SHA-256 du code PIN.
     */
    public String hashPin(String pin) {
        if (pin == null) {
            return "";
        }
        try {
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(pin.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException("Erreur lors du hachage du code PIN", e);
        }
    }

    private void publishUserCreatedEvent(Institution institution, UserCreateRequest request, String tempPassword) {
        try {
            Map<String, Object> event = new HashMap<>();
            event.put("type", "CREATED");
            event.put("username", request.getUsername().toLowerCase());
            event.put("email", request.getEmail());
            event.put("firstName", request.getFirstName());
            event.put("lastName", request.getLastName());
            event.put("tempPassword", tempPassword);
            event.put("institutionNom", institution.getNom());

            rabbitTemplate.convertAndSend(operationsExchange, "user.created", event);
            log.info("Événement de création d'utilisateur publié sur RabbitMQ pour : {}", request.getUsername());
        } catch (Exception e) {
            log.error("Impossible de publier l'événement de création d'utilisateur sur RabbitMQ: {}", e.getMessage(), e);
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
