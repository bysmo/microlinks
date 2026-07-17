package com.microlinks.sftp.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Événement publié sur RabbitMQ lors du dépôt d'un fichier dans le
 * répertoire de réception d'une institution financière.
 *
 * Consommé par le notification-service pour l'envoi d'emails.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransfertFichierEvent {

    /** Identifiant unique de l'événement */
    private UUID eventId;

    /** Type d'événement : COLLECTE, DEPOSE, ERREUR */
    private String typeEvenement;

    // Institution source (celle qui a envoyé le fichier)
    private UUID institutionSourceId;
    private String institutionSourceCode;
    private String institutionSourceNom;

    // Institution destinataire (celle qui reçoit le fichier)
    private UUID institutionDestinataireId;
    private String institutionDestinataireCode;
    private String institutionDestinataireNom;

    /** Nom du fichier transféré */
    private String nomFichier;

    /** Type de fichier (MT, MX, AFB, XLSX, CSV, XML, JSON) */
    private String typeFichier;

    /** Taille du fichier en bytes */
    private Long tailleFichierBytes;

    /** Chemin de destination du fichier déposé */
    private String cheminDestination;

    /** Horodatage de l'événement */
    private LocalDateTime timestamp;

    /** Message d'erreur en cas d'échec */
    private String messageErreur;

    /** Adresses email à notifier (liste de l'institution destinataire) */
    private List<String> emailsNotification;

    /** Indique si une notification email doit être envoyée */
    private boolean notificationRequise;
}
