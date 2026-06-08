package com.microlinks.billing.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "factures")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Facture {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 40)
    private String numero;

    @Column(name = "institution_id", nullable = false)
    private UUID institutionId;

    @Column(name = "institution_nom", length = 200)
    private String institutionNom;

    @Column(name = "institution_email", length = 200)
    private String institutionEmail;

    /** Période facturée au format YYYY-MM. */
    @Column(nullable = false, length = 7)
    private String periode;

    @Column(name = "periode_debut")
    private LocalDate periodeDebut;

    @Column(name = "periode_fin")
    private LocalDate periodeFin;

    @Enumerated(EnumType.STRING)
    @Column(name = "mode_paiement", nullable = false, length = 20)
    private ModePaiement modePaiement;

    @Column(name = "nombre_operations")
    private Long nombreOperations;

    @Column(name = "montant_unitaire", precision = 18, scale = 2)
    private BigDecimal montantUnitaire;

    @Column(name = "montant_total", nullable = false, precision = 18, scale = 2)
    private BigDecimal montantTotal;

    @Column(name = "montant_paye", precision = 18, scale = 2)
    private BigDecimal montantPaye;

    @Column(nullable = false, length = 3)
    private String devise;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatutFacture statut;

    @Column(name = "date_emission")
    private LocalDate dateEmission;

    @Column(name = "date_echeance")
    private LocalDate dateEcheance;

    /** Date au-delà de laquelle l'institution est désactivée automatiquement si impayée. */
    @Column(name = "date_limite_desactivation")
    private LocalDate dateLimiteDesactivation;

    @Column(name = "date_paiement")
    private LocalDate datePaiement;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
