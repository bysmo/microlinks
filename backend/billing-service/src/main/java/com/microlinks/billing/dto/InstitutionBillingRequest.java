package com.microlinks.billing.dto;

import com.microlinks.billing.entity.ModePaiement;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.UUID;

@Data
public class InstitutionBillingRequest {
    @NotNull
    private UUID institutionId;
    private String institutionNom;
    private String institutionEmail;
    @NotNull
    private ModePaiement modePaiement;
    private UUID tarifId;
    private Boolean actif = true;
}
