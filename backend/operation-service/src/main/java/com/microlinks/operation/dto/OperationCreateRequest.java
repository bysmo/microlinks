package com.microlinks.operation.dto;

import com.microlinks.operation.entity.TypeOperation;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class OperationCreateRequest {

    @NotNull(message = "Le type d'opération est obligatoire")
    private TypeOperation typeOperation;

    private LocalDate dateOperation;
    private LocalDate dateValeur;

    @NotNull(message = "Le montant est obligatoire")
    @DecimalMin(value = "0.01", message = "Le montant doit être supérieur à 0")
    @DecimalMax(value = "999999999999.99", message = "Montant trop élevé")
    private BigDecimal montant;

    @NotBlank(message = "La devise est obligatoire")
    @Size(min = 3, max = 10)
    private String devise;

    @Size(max = 500, message = "Le motif ne peut pas dépasser 500 caractères")
    private String motif;

    // Emetteur
    @NotNull private UUID institutionEmettriceId;
    @NotBlank private String nomInstitutionEmettrice;
    @NotBlank private String compteDonneurOrdre;
    @NotBlank private String nomDonneurOrdre;
    private UUID banqueCorrespondanteEmettriceId;
    private String nomBanqueCorrespondanteEmettrice;
    private String compteCorrespondanceEmetteur;

    // Beneficiaire
    @NotNull private UUID institutionBeneficiaireId;
    @NotBlank private String nomInstitutionBeneficiaire;
    @NotBlank private String compteBeneficiaire;
    @NotBlank private String nomBeneficiaire;
    private UUID banqueCorrespondanteReceptriceId;
    private String nomBanqueCorrespondanteReceptrice;
    private String compteCorrespondanceRecepteur;

    // Cheque (optionnel)
    private String numeroCheque;
}
