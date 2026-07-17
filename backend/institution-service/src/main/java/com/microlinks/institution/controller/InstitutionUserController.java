package com.microlinks.institution.controller;

import com.microlinks.institution.dto.UserCreateRequest;
import com.microlinks.institution.dto.UserDto;
import com.microlinks.institution.entity.Institution;
import com.microlinks.institution.exception.BusinessException;
import com.microlinks.institution.exception.ResourceNotFoundException;
import com.microlinks.institution.repository.InstitutionRepository;
import com.microlinks.institution.service.KeycloakProvisioningService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/institutions/{institutionId}/users")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Institution Users", description = "Gestion des utilisateurs/collaborateurs des institutions")
@SecurityRequirement(name = "bearerAuth")
public class InstitutionUserController {

    private final KeycloakProvisioningService keycloakProvisioningService;
    private final InstitutionRepository institutionRepository;

    @GetMapping
    @Operation(summary = "Lister les collaborateurs d'une institution")
    @PreAuthorize("hasAnyRole('ADMIN_PLATEFORME', 'ADMIN_INSTITUTION')")
    public ResponseEntity<List<UserDto>> getUsers(
            @PathVariable UUID institutionId,
            @AuthenticationPrincipal Jwt jwt) {
        
        validateAccess(institutionId, jwt);
        return ResponseEntity.ok(keycloakProvisioningService.getUsersForInstitution(institutionId));
    }

    @PostMapping
    @Operation(summary = "Créer un nouveau collaborateur (profil AGENT ou VALID)")
    @PreAuthorize("hasAnyRole('ADMIN_PLATEFORME', 'ADMIN_INSTITUTION')")
    public ResponseEntity<UserDto> createUser(
            @PathVariable UUID institutionId,
            @Valid @RequestBody UserCreateRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        
        validateAccess(institutionId, jwt);
        
        if (!institutionId.equals(request.getInstitutionId())) {
            throw new BusinessException("L'ID de l'institution dans le corps de la requête ne correspond pas à l'URL");
        }

        Institution institution = institutionRepository.findById(institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Institution avec l'id " + institutionId + " non trouvée"));

        UserDto created = keycloakProvisioningService.createUserForInstitution(
                institution, request, jwt.getSubject());

        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PatchMapping("/{userId}/status")
    @Operation(summary = "Activer ou désactiver un collaborateur")
    @PreAuthorize("hasAnyRole('ADMIN_PLATEFORME', 'ADMIN_INSTITUTION')")
    public ResponseEntity<Void> updateUserStatus(
            @PathVariable UUID institutionId,
            @PathVariable String userId,
            @RequestParam boolean enabled,
            @AuthenticationPrincipal Jwt jwt) {
        
        validateAccess(institutionId, jwt);

        // Double check that the user being updated actually belongs to the institution
        List<UserDto> users = keycloakProvisioningService.getUsersForInstitution(institutionId);
        boolean belongs = users.stream().anyMatch(u -> u.getId().equals(userId));
        if (!belongs) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        keycloakProvisioningService.updateUserStatus(userId, enabled);
        return ResponseEntity.noContent().build();
    }



    @PutMapping("/me/pin")
    @Operation(summary = "Mettre à jour son propre code PIN de sécurité")
    public ResponseEntity<Void> updateMyPin(
            @PathVariable UUID institutionId,
            @RequestParam String pin,
            @AuthenticationPrincipal Jwt jwt) {
        
        validateAccess(institutionId, jwt);
        
        // Validation du format du code PIN : 4 à 6 chiffres
        if (pin == null || !pin.matches("^[0-9]{4,6}$")) {
            throw new BusinessException("Le code PIN doit être composé de 4 à 6 chiffres");
        }
        
        String userId = jwt.getSubject();
        keycloakProvisioningService.updateUserPin(userId, pin);
        return ResponseEntity.noContent().build();
    }

    private void validateAccess(UUID institutionId, Jwt jwt) {
        String userInstitutionId = jwt.getClaimAsString("institution_id");
        if (userInstitutionId == null) {
            List<String> instIds = jwt.getClaimAsStringList("institution_id");
            if (instIds != null && !instIds.isEmpty()) {
                userInstitutionId = instIds.get(0);
            }
        }

        boolean isPlatformAdmin = false;
        Map<String, Object> realmAccess = jwt.getClaimAsMap("realm_access");
        if (realmAccess != null && realmAccess.containsKey("roles")) {
            @SuppressWarnings("unchecked")
            List<String> roles = (List<String>) realmAccess.get("roles");
            isPlatformAdmin = roles.contains("ADMIN_PLATEFORME");
        }

        if (!isPlatformAdmin) {
            if (userInstitutionId == null || !userInstitutionId.equals(institutionId.toString())) {
                throw new BusinessException("Vous n'êtes pas autorisé à accéder aux données de cette institution");
            }
        }
    }
}
