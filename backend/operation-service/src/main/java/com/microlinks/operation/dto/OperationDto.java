package com.microlinks.operation.dto;

import com.microlinks.operation.entity.StatutOperation;
import com.microlinks.operation.entity.TypeOperation;
import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class OperationDto {
    private UUID id;
    private String referenceUnique;
    private TypeOperation typeOperation;
    private StatutOperation statut;
    private String statutLabel;
    private LocalDate dateOperation;
    private LocalDate dateValeur;
    private BigDecimal montant;
    private String devise;
    private String motif;

    // Emetteur
    private UUID institutionEmettriceId;
    private String nomInstitutionEmettrice;
    private String compteDonneurOrdre;
    private String nomDonneurOrdre;
    private UUID banqueCorrespondanteEmettriceId;
    private String nomBanqueCorrespondanteEmettrice;
    private String compteCorrespondanceEmetteur;

    // Beneficiaire
    private UUID institutionBeneficiaireId;
    private String nomInstitutionBeneficiaire;
    private String compteBeneficiaire;
    private String nomBeneficiaire;
    private UUID banqueCorrespondanteReceptriceId;
    private String nomBanqueCorrespondanteReceptrice;
    private String compteCorrespondanceRecepteur;

    // Cheque
    private String numeroCheque;

    // Tracabilite
    private String commentaireRejet;
    private String creePar;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
