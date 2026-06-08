package com.microlinks.operation.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "historique_statuts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HistoriqueStatut {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "operation_id", nullable = false)
    private Operation operation;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut_avant", length = 40)
    private StatutOperation statutAvant;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut_apres", nullable = false, length = 40)
    private StatutOperation statutApres;

    @Column(columnDefinition = "TEXT")
    private String commentaire;

    @Column(name = "acteur_id", nullable = false, length = 100)
    private String acteurId;

    @Column(name = "acteur_nom", length = 200)
    private String acteurNom;

    @Column(name = "institution_id")
    private UUID institutionId;

    @Column(name = "institution_nom", length = 200)
    private String institutionNom;

    @Column(name = "date_action", nullable = false)
    private LocalDateTime dateAction;
}
