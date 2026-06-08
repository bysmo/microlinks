package com.microlinks.institution.dto;

import com.microlinks.institution.entity.StatutEntite;
import com.microlinks.institution.entity.TypeInstitution;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class InstitutionCreateRequest {

    @NotBlank(message = "Le code est obligatoire")
    @Size(max = 20, message = "Le code ne peut pas dépasser 20 caractères")
    @Pattern(regexp = "^[A-Z0-9_-]+$", message = "Le code doit être en majuscules alphanumériques")
    private String code;

    @NotBlank(message = "Le nom est obligatoire")
    @Size(max = 200, message = "Le nom ne peut pas dépasser 200 caractères")
    private String nom;

    @Size(max = 50)
    private String sigle;

    @NotNull(message = "Le type d'institution est obligatoire")
    private TypeInstitution typeInstitution;

    @NotNull(message = "La zone monétaire est obligatoire")
    private UUID zoneMonetaireId;

    @NotBlank(message = "Le pays est obligatoire")
    @Size(min = 2, max = 3, message = "Le code pays doit faire 2 ou 3 caractères (ISO)")
    private String pays;

    private String adresse;

    @Pattern(regexp = "^\\+?[0-9\\s\\-()]{7,20}$", message = "Format de téléphone invalide")
    private String telephone;

    @Email(message = "Format d'email invalide")
    private String email;

    private String siteWeb;
    private UUID banqueCorrespondanteId;
    private LocalDate dateAdhesion;
    private String codeBanqueRegional;
    private String codeBic;
    private String codeParticipantRtgs;
}
