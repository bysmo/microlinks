package com.microlinks.sftp.dto;

import lombok.Data;
import java.util.List;
import java.util.UUID;

/**
 * DTO représentant les informations SFTP d'une institution financière,
 * récupérées depuis le institution-service.
 *
 * Contient les credentials déchiffrés nécessaires pour établir la connexion SFTP.
 * Ces données ne doivent jamais être loguées.
 */
@Data
public class InstitutionSftpInfoDto {

    private UUID institutionId;
    private String institutionCode;
    private String institutionNom;

    // Connexion SFTP
    private String sftpHost;
    private Integer sftpPort;
    private String sftpUser;

    /** Mot de passe SFTP déchiffré (obtenu depuis institution-service via canal sécurisé interne) */
    private String sftpPassword;

    /** Clé privée SSH déchiffrée */
    private String sftpPrivateKey;

    // Répertoires
    private String sftpRepertoireEnvoi;
    private String sftpRepertoireReception;
    private String sftpRepertoireArchivage;

    // Protocole d'échange actif
    private Boolean protocoleActif;

    // Sens ENTRÉE (réception depuis la plateforme)
    private String protocoleEntree;
    private String typeFichierEntree;
    private String repertoireEntree;
    private String utilisateurEntree;
    private Integer portEntree;
    private String motDePasseEntree;

    // Sens SORTIE (émission vers la plateforme)
    private String protocoleSortie;
    private String typeFichierSortie;
    private String repertoireSortie;
    private String utilisateurSortie;
    private Integer portSortie;
    private String motDePasseSortie;

    // Types de fichiers acceptés
    private List<String> typesFichiersEnvoi;
    private List<String> typesFichiersReception;

    // Notifications
    private Boolean sftpNotificationActive;
    private String sftpEmailsNotification;

    /**
     * Indique si la configuration SFTP est suffisante pour établir une connexion.
     */
    public boolean isConfigurationComplete() {
        return sftpHost != null && !sftpHost.isBlank()
            && sftpUser != null && !sftpUser.isBlank()
            && (sftpPassword != null && !sftpPassword.isBlank()
                || sftpPrivateKey != null && !sftpPrivateKey.isBlank());
    }
}
