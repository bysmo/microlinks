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

    // =================== ÉMETTEUR ===================
    private UUID institutionEmettriceId;
    private String nomInstitutionEmettrice;
    private String compteDonneurOrdre;
    private String nomDonneurOrdre;
    private UUID banqueCorrespondanteEmettriceId;
    private String nomBanqueCorrespondanteEmettrice;
    private String compteCorrespondanceEmetteur;

    // Adresse ISO 20022 du Donneur d'Ordre
    private PostalAddressDto adresseDonneurOrdre;

    // Donneur d'Ordre Effectif (Ultimate Debtor — ISO 20022 UltmtDbtr)
    private String nomDonneurOrdreEffectif;
    private PostalAddressDto adresseDonneurOrdreEffectif;

    // =================== BÉNÉFICIAIRE ===================
    private UUID institutionBeneficiaireId;
    private String nomInstitutionBeneficiaire;
    private String compteBeneficiaire;
    private String nomBeneficiaire;
    private UUID banqueCorrespondanteReceptriceId;
    private String nomBanqueCorrespondanteReceptrice;
    private String compteCorrespondanceRecepteur;

    // Adresse ISO 20022 du Bénéficiaire
    private PostalAddressDto adresseBeneficiaire;

    // Bénéficiaire Effectif (Ultimate Creditor — ISO 20022 UltmtCdtr)
    private String nomBeneficiaireEffectif;
    private PostalAddressDto adresseBeneficiaireEffectif;

    // =================== CHÈQUE ===================
    private String numeroCheque;

    // =================== TRAÇABILITÉ ===================
    private String commentaireRejet;
    private String creePar;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Blockchain
    private String previousHash;
    private String hash;
}
