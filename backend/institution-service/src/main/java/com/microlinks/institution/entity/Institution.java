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

    // ===================== Protocole d'échange — Serveur partagé =====================

    /** Hôte du serveur d'échange (nom de domaine ou IP) */
    @Column(name = "sftp_host", length = 200)
    private String sftpHost;

    /** Adresse IP du serveur d'échange */
    @Column(name = "sftp_adresse_ip", length = 45)
    private String sftpAdresseIp;

    /** Indique si la configuration du protocole d'échange est active */
    @Column(name = "protocole_actif")
    @Builder.Default
    private Boolean protocoleActif = false;

    // ===================== Sens ENTRÉE (réception depuis la plateforme) =====================

    /** Protocole ENTRÉE : SFTP, FTP, FTPS */
    @Column(name = "protocole_entree", length = 10)
    private String protocoleEntree;

    /** Type de fichier unique pour les ENTRÉES : MT, MX, AFB, CSV, XLSX, XML, JSON */
    @Column(name = "type_fichier_entree", length = 10)
    private String typeFichierEntree;

    /** Répertoire ENTRÉE sur le serveur (réception depuis la plateforme) */
    @Column(name = "repertoire_entree", length = 500)
    private String repertoireEntree;

    /** Nom d'utilisateur / login pour les ENTRÉES */
    @Column(name = "utilisateur_entree", length = 100)
    private String utilisateurEntree;

    /** Port de connexion pour les ENTRÉES */
    @Column(name = "port_entree")
    private Integer portEntree;

    /** Mot de passe ENTRÉE chiffré en AES-256/GCM */
    @Convert(converter = SensitiveStringConverter.class)
    @Column(name = "mot_de_passe_entree", columnDefinition = "TEXT")
    private String motDePasseEntree;

    // ===================== Sens SORTIE (émission vers la plateforme) =====================

    /** Protocole SORTIE : SFTP, FTP, FTPS */
    @Column(name = "protocole_sortie", length = 10)
    private String protocoleSortie;

    /** Type de fichier unique pour les SORTIES : MT, MX, AFB, CSV, XLSX, XML, JSON */
    @Column(name = "type_fichier_sortie", length = 10)
    private String typeFichierSortie;

    /** Répertoire SORTIE sur le serveur (émission vers la plateforme) */
    @Column(name = "repertoire_sortie", length = 500)
    private String repertoireSortie;

    /** Nom d'utilisateur / login pour les SORTIES */
    @Column(name = "utilisateur_sortie", length = 100)
    private String utilisateurSortie;

    /** Port de connexion pour les SORTIES */
    @Column(name = "port_sortie")
    private Integer portSortie;

    /** Mot de passe SORTIE chiffré en AES-256/GCM */
    @Convert(converter = SensitiveStringConverter.class)
    @Column(name = "mot_de_passe_sortie", columnDefinition = "TEXT")
    private String motDePasseSortie;

    // ===================== Anciens champs SFTP conservés pour compatibilité (admin plateforme) =====================

    /** Clé privée SSH chiffrée en AES-256/GCM (alternative au mot de passe) */
    @Convert(converter = SensitiveStringConverter.class)
    @Column(name = "sftp_private_key", columnDefinition = "TEXT")
    private String sftpPrivateKey;

    /** Mot de passe SFTP admin chiffré en AES-256/GCM */
    @Convert(converter = SensitiveStringConverter.class)
    @Column(name = "sftp_password", columnDefinition = "TEXT")
    private String sftpPassword;

    /** Utilisateur SFTP admin */
    @Column(name = "sftp_user", length = 100)
    private String sftpUser;

    /** Port SFTP admin */
    @Column(name = "sftp_port")
    private Integer sftpPort;

    /** Répertoire d'envoi SFTP admin */
    @Column(name = "sftp_repertoire_envoi", length = 500)
    private String sftpRepertoireEnvoi;

    /** Répertoire de réception SFTP admin */
    @Column(name = "sftp_repertoire_reception", length = 500)
    private String sftpRepertoireReception;

    /** Répertoire d'archivage SFTP admin */
    @Column(name = "sftp_repertoire_archivage", length = 500)
    private String sftpRepertoireArchivage;

    // ===================== Types de fichiers échangeables (anciens champs — conservés pour compatibilité) =====================

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
