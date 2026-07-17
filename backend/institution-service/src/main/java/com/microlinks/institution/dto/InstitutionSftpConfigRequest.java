package com.microlinks.institution.dto;

import com.microlinks.institution.entity.TypeFichierEchange;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.util.List;

/**
 * Request DTO pour la configuration SFTP d'une institution financière.
 * Utilisé exclusivement par l'ADMIN_PLATEFORME.
 *
 * Le mot de passe et la clé privée sont optionnels : si null/vide,
 * la valeur existante est conservée.
 */
@Data
public class InstitutionSftpConfigRequest {

    @Size(max = 200, message = "L'hôte SFTP ne peut pas dépasser 200 caractères")
    private String sftpHost;

    @Min(value = 1, message = "Le port SFTP doit être supérieur à 0")
    @Max(value = 65535, message = "Le port SFTP doit être inférieur à 65536")
    private Integer sftpPort;

    @Size(max = 100, message = "L'utilisateur SFTP ne peut pas dépasser 100 caractères")
    private String sftpUser;

    /**
     * Mot de passe SFTP.
     * Si null ou vide, la valeur existante en base est conservée.
     */
    private String sftpPassword;

    /**
     * Clé privée SSH (contenu PEM).
     * Si null ou vide, la valeur existante en base est conservée.
     */
    private String sftpPrivateKey;

    @Size(max = 500, message = "Le répertoire d'envoi ne peut pas dépasser 500 caractères")
    private String sftpRepertoireEnvoi;

    @Size(max = 500, message = "Le répertoire de réception ne peut pas dépasser 500 caractères")
    private String sftpRepertoireReception;

    @Size(max = 500, message = "Le répertoire d'archivage ne peut pas dépasser 500 caractères")
    private String sftpRepertoireArchivage;

    /** Types de fichiers que l'institution peut envoyer vers la plateforme */
    private List<TypeFichierEchange> typesFichiersEnvoi;

    /** Types de fichiers que l'institution peut recevoir de la plateforme */
    private List<TypeFichierEchange> typesFichiersReception;

    /** Activer les notifications email lors de la réception d'un fichier */
    private Boolean sftpNotificationActive;

    /**
     * Adresses email des destinataires des notifications.
     * Plusieurs adresses séparées par des point-virgules (;).
     * Exemple : "admin@banque-a.ml;dsi@banque-a.ml"
     */
    @Size(max = 2000, message = "La liste des emails de notification ne peut pas dépasser 2000 caractères")
    private String sftpEmailsNotification;
}
