package com.microlinks.billing.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

/**
 * Paramètres globaux de facturation (singleton, id = 1).
 */
@Entity
@Table(name = "billing_settings")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BillingSettings {

    @Id
    private Integer id;

    /** Délai (en jours) après l'échéance avant désactivation automatique. Configurable. */
    @Column(name = "delai_desactivation_jours", nullable = false)
    private Integer delaiDesactivationJours;

    /** Active/désactive la désactivation automatique des institutions en retard. */
    @Column(name = "auto_desactivation_active", nullable = false)
    private Boolean autoDesactivationActive;

    /** Jour du mois où les factures sont générées (1-28). */
    @Column(name = "jour_generation", nullable = false)
    private Integer jourGeneration;

    /** Délai de paiement (jours) accordé à compter de l'émission de la facture. */
    @Column(name = "delai_paiement_jours", nullable = false)
    private Integer delaiPaiementJours;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;
}
