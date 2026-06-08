package com.microlinks.billing.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Configuration de facturation propre à une institution :
 * mode de paiement choisi et tarif appliqué.
 */
@Entity
@Table(name = "institution_billing")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InstitutionBilling {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "institution_id", nullable = false, unique = true)
    private UUID institutionId;

    @Column(name = "institution_nom", length = 200)
    private String institutionNom;

    @Column(name = "institution_email", length = 200)
    private String institutionEmail;

    @Enumerated(EnumType.STRING)
    @Column(name = "mode_paiement", nullable = false, length = 20)
    private ModePaiement modePaiement;

    @Column(name = "tarif_id")
    private UUID tarifId;

    @Column(nullable = false)
    private Boolean actif;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
