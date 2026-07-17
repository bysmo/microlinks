package com.microlinks.institution.entity;

import com.microlinks.institution.config.SensitiveStringConverter;
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

    // ===================== Configuration SFTP (admin uniquement) =====================

    /** Protocole d'échange : SFTP, FTP, FTPS */
    @Column(name = "protocole_echange", length = 10)
    private String protocoleEchange;

    /** Hôte SFTP de l'institution (nom de domaine) */
    @Column(name = "sftp_host", length = 200)
    private String sftpHost;

    /** Adresse IP du serveur d'échange */
    @Column(name = "sftp_adresse_ip", length = 45)
    private String sftpAdresseIp;

    /** Port SFTP (défaut : 22) */
    @Column(name = "sftp_port")
    private Integer sftpPort;

    /** Nom d'utilisateur SFTP */
    @Column(name = "sftp_user", length = 100)
    private String sftpUser;

    /** Mot de passe SFTP chiffré en AES-256/GCM */
    @Convert(converter = SensitiveStringConverter.class)
    @Column(name = "sftp_password", columnDefinition = "TEXT")
    private String sftpPassword;

    /** Clé privée SSH chiffrée en AES-256/GCM (alternative au mot de passe) */
    @Convert(converter = SensitiveStringConverter.class)
    @Column(name = "sftp_private_key", columnDefinition = "TEXT")
    private String sftpPrivateKey;

    /** Répertoire SFTP où l'institution dépose ses fichiers à envoyer vers la plateforme */
    @Column(name = "sftp_repertoire_envoi", length = 500)
    private String sftpRepertoireEnvoi;

    /** Répertoire SFTP où la plateforme dépose les fichiers destinés à cette institution */
    @Column(name = "sftp_repertoire_reception", length = 500)
    private String sftpRepertoireReception;

    /** Répertoire SFTP où les fichiers traités sont archivés */
    @Column(name = "sftp_repertoire_archivage", length = 500)
    private String sftpRepertoireArchivage;

    /** Indique si la configuration du protocole d'échange est active */
    @Column(name = "protocole_actif")
    @Builder.Default
    private Boolean protocoleActif = false;


    // ===================== Types de fichiers échangeables =====================

    /** Types de fichiers que cette institution peut envoyer vers la plateforme */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(
        name = "institution_types_fichiers_envoi",
        joinColumns = @JoinColumn(name = "institution_id")
    )
    @Enumerated(EnumType.STRING)
    @Column(name = "type_fichier", length = 20)
    @Builder.Default
    private List<TypeFichierEchange> typesFichiersEnvoi = new java.util.ArrayList<>();

    /** Types de fichiers que cette institution peut recevoir de la plateforme */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(
        name = "institution_types_fichiers_reception",
        joinColumns = @JoinColumn(name = "institution_id")
    )
    @Enumerated(EnumType.STRING)
    @Column(name = "type_fichier", length = 20)
    @Builder.Default
    private List<TypeFichierEchange> typesFichiersReception = new java.util.ArrayList<>();

    // ===================== Notifications SFTP =====================

    /** Si true, l'administrateur de l'établissement est notifié par email à chaque fichier reçu */
    @Column(name = "sftp_notification_active")
    @Builder.Default
    private Boolean sftpNotificationActive = false;

    /**
     * Adresses email des destinataires des notifications SFTP.
     * Plusieurs adresses séparées par des point-virgules (;).
     */
    @Column(name = "sftp_emails_notification", columnDefinition = "TEXT")
    private String sftpEmailsNotification;

    // ===================== Audit =====================

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
