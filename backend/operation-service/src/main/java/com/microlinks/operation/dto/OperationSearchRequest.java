package com.microlinks.operation.dto;

import com.microlinks.operation.entity.StatutOperation;
import com.microlinks.operation.entity.TypeOperation;
import lombok.Data;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class OperationSearchRequest {
    private String search;
    private TypeOperation typeOperation;
    private StatutOperation statut;
    private UUID institutionEmettriceId;
    private UUID institutionBeneficiaireId;
    private UUID institutionId;
    private UUID banqueCorrespondanteEmettriceId;
    private UUID banqueCorrespondanteReceptriceId;
    private LocalDate dateDebut;
    private LocalDate dateFin;
    private String devise;
}
