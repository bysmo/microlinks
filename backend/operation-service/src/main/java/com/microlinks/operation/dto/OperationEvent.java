package com.microlinks.operation.dto;

import com.microlinks.operation.entity.StatutOperation;
import com.microlinks.operation.entity.TypeOperation;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record OperationEvent(
    UUID operationId,
    String referenceUnique,
    TypeOperation typeOperation,
    StatutOperation statutAvant,
    StatutOperation statutApres,
    BigDecimal montant,
    String devise,
    String nomDonneurOrdre,
    String nomBeneficiaire,
    UUID institutionEmettriceId,
    UUID institutionBeneficiaireId,
    String statutLabel,
    String prochainActeur,
    LocalDateTime timestamp
) {}
