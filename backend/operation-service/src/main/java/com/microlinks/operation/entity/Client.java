package com.microlinks.operation.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "clients", indexes = {
    @Index(name = "idx_client_numero_compte", columnList = "numero_compte"),
    @Index(name = "idx_client_institution", columnList = "institution_id")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Client {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "numero_compte", nullable = false, length = 50)
    private String numeroCompte;

    @Column(name = "nom_complet", nullable = false, length = 200)
    private String nomComplet;

    @Column(name = "prenom", length = 100)
    private String prenom;

    @Column(name = "nom", length = 100)
    private String nom;

    @Column(name = "institution_id", nullable = false)
    private UUID institutionId;

    @Column(name = "nom_institution", length = 200)
    private String nomInstitution;

    @Column(name = "type_compte", length = 30)
    private String typeCompte;

    @Column(name = "telephone", length = 30)
    private String telephone;

    @Column(name = "email", length = 200)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatutClient statut = StatutClient.ACTIF;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
