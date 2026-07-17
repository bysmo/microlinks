package com.microlinks.billing.dto;

import com.microlinks.billing.entity.ModePaiement;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class TarifRequest {
    @NotBlank
    private String code;
    @NotBlank
    private String libelle;
    private String description;
    @NotNull
    private ModePaiement modePaiement;
    @NotNull
    @DecimalMin("0.0")
    private BigDecimal montant;
    @NotBlank
    private String devise;
    private Boolean actif = true;
}
