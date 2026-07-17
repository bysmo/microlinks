package com.microlinks.sftp.service;

import com.jcraft.jsch.ChannelSftp;
import com.microlinks.sftp.client.InstitutionSftpClient;
import com.microlinks.sftp.config.RabbitMQConfig;
import com.microlinks.sftp.dto.InstitutionSftpInfoDto;
import com.microlinks.sftp.dto.TransfertFichierEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

/**
 * Service de dépôt des fichiers de transactions dans les répertoires SFTP
 * de réception des institutions financières destinataires.
 *
 * Après collecte et traitement d'un fichier, ce service :
 * 1. Identifie les institutions destinataires (actuellement : toutes les institutions actives
 *    dont le type de fichier est dans typesFichiersReception)
 * 2. Se connecte à chaque institution destinataire via SFTP
 * 3. Dépose le fichier dans le répertoire de réception
 * 4. Publie un événement RabbitMQ pour la notification email
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SftpDeliveryService {

    private final InstitutionSftpClient institutionClient;
    private final SftpConnectionService connectionService;
    private final RabbitTemplate rabbitTemplate;

    /**
     * Distribue un fichier vers toutes les institutions qui peuvent le recevoir.
     *
     * Dans la version actuelle (transport uniquement), le fichier est déposé
     * dans les répertoires de réception de toutes les institutions actives
     * capables de recevoir ce type de fichier (sauf l'institution source).
     *
     * En phase 2 (service d'intégration), un routage basé sur le contenu du
     * fichier permettra de cibler des institutions spécifiques.
     *
     * @param fileContent   Contenu du fichier à distribuer
     * @param nomFichier    Nom du fichier
     * @param typeFichier   Type de fichier (MT, MX, AFB, XLSX, CSV, XML, JSON)
     * @param source        Institution source du fichier
     */
    public void distributeFile(byte[] fileContent, String nomFichier,
                                String typeFichier, InstitutionSftpInfoDto source) {
        List<InstitutionSftpInfoDto> toutes = institutionClient.getAllActiveInstitutionsSftpConfig();

        for (InstitutionSftpInfoDto destinataire : toutes) {
            // Ne pas redéposer chez la source
            if (destinataire.getInstitutionId().equals(source.getInstitutionId())) continue;

            // Vérifier que l'institution peut recevoir ce type de fichier
            if (!peutRecevoirType(destinataire, typeFichier)) {
                log.debug("Institution {} ne peut pas recevoir le type {} — ignorée",
                        destinataire.getInstitutionCode(), typeFichier);
                continue;
            }

            // Vérifier la config complète pour la réception
            if (!destinataire.isConfigurationComplete()
                    || destinataire.getSftpRepertoireReception() == null
                    || destinataire.getSftpRepertoireReception().isBlank()) {
                log.warn("Institution {} : config SFTP réception incomplète — ignorée",
                        destinataire.getInstitutionCode());
                continue;
            }

            deposerFichier(fileContent, nomFichier, typeFichier, source, destinataire);
        }
    }

    /**
     * Dépose un fichier chez une institution destinataire spécifique.
     */
    public void deposerFichier(byte[] fileContent, String nomFichier, String typeFichier,
                                InstitutionSftpInfoDto source, InstitutionSftpInfoDto destinataire) {
        ChannelSftp channel = null;
        try {
            channel = connectionService.openSftpChannel(destinataire);

            // S'assurer que le répertoire de réception existe
            connectionService.ensureRemoteDirectoryExists(
                    channel, destinataire.getSftpRepertoireReception());

            // Construire le chemin de destination avec horodatage pour éviter les conflits
            String timestamp = LocalDateTime.now().toString()
                    .replace(":", "-").replace(".", "-");
            String nomFichierDest = source.getInstitutionCode() + "_" + timestamp + "_" + nomFichier;
            String cheminDest = destinataire.getSftpRepertoireReception() + "/" + nomFichierDest;

            // Dépôt du fichier
            connectionService.uploadFile(channel, fileContent, cheminDest);
            log.info("Fichier '{}' déposé chez {} : {}", nomFichier, destinataire.getInstitutionCode(), cheminDest);

            // Publier un événement pour notification email
            publierEvenementDepose(source, destinataire, nomFichier, typeFichier,
                    (long) fileContent.length, cheminDest);

        } catch (Exception e) {
            log.error("Erreur lors du dépôt du fichier {} chez l'institution {} : {}",
                    nomFichier, destinataire.getInstitutionCode(), e.getMessage(), e);
        } finally {
            connectionService.closeSftpChannel(channel);
        }
    }

    /**
     * Vérifie si une institution peut recevoir un type de fichier donné.
     * Si aucun type n'est configuré, tous les types sont acceptés.
     */
    private boolean peutRecevoirType(InstitutionSftpInfoDto institution, String typeFichier) {
        List<String> typesAcceptes = institution.getTypesFichiersReception();
        if (typesAcceptes == null || typesAcceptes.isEmpty()) return true;
        return typesAcceptes.contains(typeFichier);
    }

    private void publierEvenementDepose(InstitutionSftpInfoDto source,
                                         InstitutionSftpInfoDto destinataire,
                                         String nomFichier, String typeFichier,
                                         long taille, String cheminDest) {
        // Préparer la liste des emails de notification
        List<String> emails = List.of();
        boolean notificationRequise = Boolean.TRUE.equals(destinataire.getSftpNotificationActive())
                && destinataire.getSftpEmailsNotification() != null
                && !destinataire.getSftpEmailsNotification().isBlank();

        if (notificationRequise) {
            emails = Arrays.stream(destinataire.getSftpEmailsNotification().split(";"))
                    .map(String::trim)
                    .filter(e -> !e.isEmpty())
                    .toList();
        }

        TransfertFichierEvent event = TransfertFichierEvent.builder()
                .eventId(UUID.randomUUID())
                .typeEvenement("DEPOSE")
                .institutionSourceId(source.getInstitutionId())
                .institutionSourceCode(source.getInstitutionCode())
                .institutionSourceNom(source.getInstitutionNom())
                .institutionDestinataireId(destinataire.getInstitutionId())
                .institutionDestinataireCode(destinataire.getInstitutionCode())
                .institutionDestinataireNom(destinataire.getInstitutionNom())
                .nomFichier(nomFichier)
                .typeFichier(typeFichier)
                .tailleFichierBytes(taille)
                .cheminDestination(cheminDest)
                .timestamp(LocalDateTime.now())
                .emailsNotification(emails)
                .notificationRequise(notificationRequise)
                .build();

        rabbitTemplate.convertAndSend(RabbitMQConfig.SFTP_EXCHANGE, RabbitMQConfig.SFTP_DEPOSE_KEY, event);
        log.debug("Événement DEPOSE publié sur RabbitMQ pour {} → {}",
                source.getInstitutionCode(), destinataire.getInstitutionCode());
    }
}
