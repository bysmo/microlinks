package com.microlinks.operation.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.FilterDef;
import org.hibernate.annotations.ParamDef;
import com.microlinks.operation.config.SensitiveStringConverter;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Représente un client d'une institution (donneur d'ordre ou bénéficiaire).
 * Données chiffrées (FLE) et cloisonnées par tenant.
 */
@Entity
@Table(name = "clients", indexes = {
    @Index(name = "idx_client_numero_compte", columnList = "numero_compte"),
    @Index(name = "idx_client_institution", columnList = "institution_id"),
    @Index(name = "idx_client_tenant", columnList = "tenant_id")
})
@FilterDef(name = "tenantFilter", parameters = @ParamDef(name = "tenantId", type = String.class))
@Filter(name = "tenantFilter", condition = "tenant_id = cast(:tenantId as uuid)")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Client {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "tenant_id")
    private UUID tenantId;

    @Convert(converter = SensitiveStringConverter.class)
    @Column(name = "numero_compte", nullable = false, length = 255)
    private String numeroCompte;

    @Convert(converter = SensitiveStringConverter.class)
    @Column(name = "nom_complet", nullable = false, length = 255)
    private String nomComplet;

    @Convert(converter = SensitiveStringConverter.class)
    @Column(name = "prenom", length = 255)
    private String prenom;

    @Convert(converter = SensitiveStringConverter.class)
    @Column(name = "nom", length = 255)
    private String nom;

    @Column(name = "institution_id", nullable = false)
    private UUID institutionId;

    @Column(name = "nom_institution", length = 200)
    private String nomInstitution;

    @Column(name = "type_compte", length = 30)
    private String typeCompte;

    @Convert(converter = SensitiveStringConverter.class)
    @Column(name = "telephone", length = 255)
    private String telephone;

    @Convert(converter = SensitiveStringConverter.class)
    @Column(name = "email", length = 255)
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
