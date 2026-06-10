package com.microlinks.institution.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "institutions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Institution {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 20)
    private String code;

    @Column(nullable = false, length = 200)
    private String nom;

    @Column(length = 50)
    private String sigle;

    @Enumerated(EnumType.STRING)
    @Column(name = "type_institution", nullable = false, length = 30)
    private TypeInstitution typeInstitution;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "zone_monetaire_id", nullable = false)
    private ZoneMonetaire zoneMonetaire;

    @Column(nullable = false, length = 3)
    private String pays;

    @Column(columnDefinition = "TEXT")
    private String adresse;

    @Column(length = 30)
    private String telephone;

    @Column(length = 200)
    private String email;

    @Column(name = "site_web", length = 200)
    private String siteWeb;

    @Column(name = "logo_url", length = 500)
    private String logoUrl;

    @Column(name = "code_banque_regional", length = 50)
    private String codeBanqueRegional;

    @Column(name = "code_bic", length = 20)
    private String codeBic;

    @Column(name = "code_participant_rtgs", length = 50)
    private String codeParticipantRtgs;

    @Column(name = "code_microlink", unique = true, length = 50)
    private String codeMicrolink;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "banque_correspondante_id")
    private Institution banqueCorrespondante;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatutEntite statut = StatutEntite.INACTIF;

    @Column(name = "date_adhesion")
    private LocalDate dateAdhesion;

    @Column(name = "compte_reglement", length = 100)
    private String compteReglement;

    @Column(name = "banque_reglement", length = 200)
    private String banqueReglement;

    @OneToMany(mappedBy = "institution", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Agence> agences;

    @OneToMany(mappedBy = "institutionProprietaire", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<CompteCorrespondance> comptesCorrespondance;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;
}
