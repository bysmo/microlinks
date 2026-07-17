package com.microlinks.institution.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.UUID;

@Data
public class CompteCorrespondanceRequest {

    @NotBlank(message = "Le numéro de compte est obligatoire")
    private String numeroCompte;

    private String libelle;

    @NotNull(message = "La banque domiciliataire est obligatoire")
    private UUID banqueDomiciliaireId;

    /** REGLEMENT ou CORRESPONDANCE */
    private String typeCompte = "REGLEMENT";
}
