package com.microlinks.institution.dto;

import com.microlinks.institution.entity.TypeFichierEchange;
import lombok.Data;
import java.util.List;

/**
 * DTO de configuration SFTP d'une institution financière.
 * Ne contient jamais les données sensibles (mot de passe, clé privée).
 * Visible uniquement par ADMIN_PLATEFORME.
 */
@Data
public class InstitutionSftpDto {

    /** Hôte SFTP (IP ou nom de domaine) */
    private String sftpHost;

    /** Port SFTP (défaut : 22) */
    private Integer sftpPort;

    /** Nom d'utilisateur SFTP */
    private String sftpUser;

    /** Indique si un mot de passe est configuré (sans révéler sa valeur) */
    private boolean sftpPasswordConfigured;

    /** Indique si une clé privée SSH est configurée (sans révéler sa valeur) */
    private boolean sftpPrivateKeyConfigured;

    /** Répertoire SFTP d'envoi (l'institution y dépose ses fichiers) */
    private String sftpRepertoireEnvoi;

    /** Répertoire SFTP de réception (la plateforme y dépose les fichiers) */
    private String sftpRepertoireReception;

    /** Répertoire SFTP d'archivage */
    private String sftpRepertoireArchivage;

    /** Types de fichiers que l'institution peut envoyer */
    private List<TypeFichierEchange> typesFichiersEnvoi;

    /** Types de fichiers que l'institution peut recevoir */
    private List<TypeFichierEchange> typesFichiersReception;

    /** Notification email activée lors de la réception d'un fichier */
    private Boolean sftpNotificationActive;

    /** Adresses email de notification, séparées par des point-virgules (;) */
    private String sftpEmailsNotification;
}
