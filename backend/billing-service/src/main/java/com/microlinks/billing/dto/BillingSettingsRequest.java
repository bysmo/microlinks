package com.microlinks.billing.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class BillingSettingsRequest {
    @NotNull @Min(0)
    private Integer delaiDesactivationJours;
    @NotNull
    private Boolean autoDesactivationActive;
    @NotNull @Min(1) @Max(28)
    private Integer jourGeneration;
    @NotNull @Min(0)
    private Integer delaiPaiementJours;
}
