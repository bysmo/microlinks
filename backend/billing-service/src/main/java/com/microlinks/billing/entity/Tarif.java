package com.microlinks.billing.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Tarif configurable par l'administrateur.
 * - Mode PAR_OPERATION : {@code montant} = prix unitaire par opération.
 * - Mode FORFAIT       : {@code montant} = montant de l'abonnement périodique.
 */
@Entity
@Table(name = "tarifs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Tarif {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false, length = 200)
    private String libelle;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "mode_paiement", nullable = false, length = 20)
    private ModePaiement modePaiement;

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal montant;

    @Column(nullable = false, length = 3)
    private String devise;

    @Column(nullable = false)
    private Boolean actif;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "created_by", length = 100)
    private String createdBy;
}
