package com.microlinks.sftp.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class OperationDto {
    private UUID id;
    private String referenceUnique;
    private String typeOperation;
    private BigDecimal montant;
    private String devise;
    private LocalDate dateOperation;
    private String compteDonneurOrdre;
    private String nomDonneurOrdre;
    private String compteBeneficiaire;
    private String nomBeneficiaire;
    private UUID institutionEmettriceId;
    private UUID institutionBeneficiaireId;
    private String motif;
}
