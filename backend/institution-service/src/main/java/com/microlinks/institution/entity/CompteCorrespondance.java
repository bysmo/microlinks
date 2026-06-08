package com.microlinks.institution.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "comptes_correspondance")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompteCorrespondance {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "numero_compte", nullable = false, length = 50)
    private String numeroCompte;

    @Column(length = 200)
    private String libelle;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "institution_proprietaire_id", nullable = false)
    private Institution institutionProprietaire;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "banque_domiciliataire_id", nullable = false)
    private Institution banqueDomiciliataire;

    @Column(name = "type_compte", length = 30)
    private String typeCompte;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatutEntite statut = StatutEntite.ACTIF;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
