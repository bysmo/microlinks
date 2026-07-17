package com.microlinks.institution.dto;

import com.microlinks.institution.entity.StatutEntite;
import com.microlinks.institution.entity.TypeFichierEchange;
import com.microlinks.institution.entity.TypeInstitution;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
public class InstitutionDto {
    private UUID id;
    private String code;
    private String nom;
    private String sigle;
    private TypeInstitution typeInstitution;
    private ZoneMonetaireDto zoneMonetaire;
    private String codeBanqueRegional;
    private String codeBic;
    private String codeParticipantRtgs;
    private String codeMicrolink;
    private String pays;
    private String adresse;
    private String telephone;
    private String email;
    private String siteWeb;
    private String logoUrl;
    private UUID banqueCorrespondanteId;
    private String banqueCorrespondanteNom;
    private StatutEntite statut;
    private LocalDate dateAdhesion;
    private String compteReglement;
    private String banqueReglement;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private int nombreAgences;

    /** Types de fichiers que l'institution peut envoyer */
    private List<TypeFichierEchange> typesFichiersEnvoi;

    /** Types de fichiers que l'institution peut recevoir */
    private List<TypeFichierEchange> typesFichiersReception;

    /**
     * Configuration SFTP de l'institution.
     * Ce champ n'est rempli que pour les appels de l'ADMIN_PLATEFORME
     * (les autres rôles reçoivent null).
     */
    private InstitutionSftpDto sftpConfig;
}
