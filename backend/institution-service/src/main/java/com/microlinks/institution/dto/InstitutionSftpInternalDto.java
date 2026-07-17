package com.microlinks.institution.dto;

import com.microlinks.institution.entity.TypeFichierEchange;
import lombok.Data;
import java.util.List;
import java.util.UUID;

/**
 * DTO interne pour les échanges service-à-service (institution-service → sftp-service).
 *
 * ATTENTION : Ce DTO contient les credentials SFTP déchiffrés.
 * Il ne doit JAMAIS être exposé via l'API Gateway ou retourné à un client externe.
 * L'endpoint /internal/sftp-configs est restreint au réseau interne Docker uniquement.
 */
@Data
public class InstitutionSftpInternalDto {

    private UUID institutionId;
    private String institutionCode;
    private String institutionNom;

    // Connexion SFTP (credentials en clair — canal interne uniquement)
    private String sftpHost;
    private Integer sftpPort;
    private String sftpUser;
    private String sftpPassword;
    private String sftpPrivateKey;

    // Répertoires
    private String sftpRepertoireEnvoi;
    private String sftpRepertoireReception;
    private String sftpRepertoireArchivage;

    // Types de fichiers
    private List<TypeFichierEchange> typesFichiersEnvoi;
    private List<TypeFichierEchange> typesFichiersReception;

    // Notifications
    private Boolean sftpNotificationActive;
    private String sftpEmailsNotification;
}
