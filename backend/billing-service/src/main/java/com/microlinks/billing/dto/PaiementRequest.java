package com.microlinks.billing.dto;

import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class PaiementRequest {
    @NotNull @DecimalMin("0.0")
    private BigDecimal montant;
    private LocalDate datePaiement;
    private String moyenPaiement;
    private String reference;
    private String commentaire;
}
