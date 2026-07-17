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

import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Service de collecte des fichiers déposés par les institutions dans leurs
 * répertoires d'envoi SFTP.
 *
 * Flux de traitement pour chaque institution :
 * 1. Connexion SFTP à l'institution
 * 2. Liste des fichiers dans le répertoire d'envoi
 * 3. Pour chaque fichier :
 *    a. Vérification que le type correspond aux typesFichiersEnvoi déclarés
 *    b. Téléchargement du fichier en mémoire
 *    c. Archivage du fichier source (déplacement vers répertoire d'archivage)
 *    d. Transmission au SftpDeliveryService pour distribution
 * 4. Publication d'un événement RabbitMQ (pour journalisation)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SftpCollectorService {

    private final InstitutionSftpClient institutionClient;
    private final SftpConnectionService connectionService;
    private final SftpDeliveryService deliveryService;
    private final RabbitTemplate rabbitTemplate;

    /**
     * Collecte les fichiers sur toutes les institutions actives configurées en SFTP.
     *
     * @return Résumé de la collecte (nombre de fichiers collectés, erreurs)
     */
    public CollectionResult collectAllInstitutions() {
        log.info("=== Début de la collecte SFTP sur toutes les institutions ===");
        List<InstitutionSftpInfoDto> institutions = institutionClient.getAllActiveInstitutionsSftpConfig();

        int totalCollectes = 0;
        int totalErreurs = 0;
        List<String> erreurs = new ArrayList<>();

        for (InstitutionSftpInfoDto institution : institutions) {
            try {
                int collectes = collectForInstitution(institution);
                totalCollectes += collectes;
                log.info("Institution {} : {} fichier(s) collecté(s)", institution.getInstitutionCode(), collectes);
            } catch (Exception e) {
                totalErreurs++;
                String msg = String.format("Erreur lors de la collecte pour %s : %s",
                        institution.getInstitutionCode(), e.getMessage());
                erreurs.add(msg);
                log.error(msg, e);
            }
        }

        log.info("=== Fin de la collecte SFTP : {} collecté(s), {} erreur(s) ===", totalCollectes, totalErreurs);
        return new CollectionResult(totalCollectes, totalErreurs, erreurs);
    }

    /**
     * Collecte les fichiers pour une institution spécifique.
     *
     * @param institutionCode Code de l'institution
     * @return Nombre de fichiers collectés
     */
    public int collectForInstitutionByCode(String institutionCode) {
        InstitutionSftpInfoDto config = institutionClient.getInstitutionSftpConfigByCode(institutionCode);
        if (config == null) {
            throw new IllegalArgumentException("Institution introuvable ou sans config SFTP : " + institutionCode);
        }
        return collectForInstitution(config);
    }

    /**
     * Effectue la collecte SFTP pour une institution.
     */
    private int collectForInstitution(InstitutionSftpInfoDto config) {
        if (!config.isConfigurationComplete()) {
            log.warn("Configuration SFTP incomplète pour l'institution {} — collecte ignorée",
                    config.getInstitutionCode());
            return 0;
        }

        String repertoireEnvoi = config.getSftpRepertoireEnvoi();
        if (repertoireEnvoi == null || repertoireEnvoi.isBlank()) {
            log.warn("Répertoire d'envoi non configuré pour l'institution {} — collecte ignorée",
                    config.getInstitutionCode());
            return 0;
        }

        ChannelSftp channel = null;
        int nbCollectes = 0;

        try {
            channel = connectionService.openSftpChannel(config);
            // S'assurer que le répertoire d'archivage existe
            if (config.getSftpRepertoireArchivage() != null) {
                connectionService.ensureRemoteDirectoryExists(channel, config.getSftpRepertoireArchivage());
            }

            Vector<ChannelSftp.LsEntry> entries = connectionService.listFiles(channel, repertoireEnvoi);
            log.info("Institution {} : {} fichier(s) trouvé(s) dans le répertoire d'envoi",
                    config.getInstitutionCode(), entries.size());

            for (ChannelSftp.LsEntry entry : entries) {
                if (entry.getAttrs().isDir()) continue; // ignorer les sous-répertoires

                String nomFichier = entry.getFilename();
                String typeFichier = detecterTypeFichier(nomFichier);

                // Vérifier que le type de fichier est dans les types autorisés pour l'envoi
                if (!isTypeAutorise(typeFichier, config.getTypesFichiersEnvoi())) {
                    log.warn("Fichier {} ignoré : type '{}' non autorisé pour l'envoi de l'institution {}",
                            nomFichier, typeFichier, config.getInstitutionCode());
                    continue;
                }

                String cheminSource = repertoireEnvoi + "/" + nomFichier;

                try {
                    // 1. Téléchargement du fichier
                    InputStream fileStream = connectionService.downloadFile(channel, cheminSource);
                    byte[] fileContent = fileStream.readAllBytes();
                    long taille = fileContent.length;

                    // 2. Archivage : déplacer vers le répertoire d'archivage
                    if (config.getSftpRepertoireArchivage() != null) {
                        String timestamp = LocalDateTime.now().toString()
                                .replace(":", "-").replace(".", "-");
                        String cheminArchive = config.getSftpRepertoireArchivage()
                                + "/" + timestamp + "_" + nomFichier;
                        connectionService.moveFile(channel, cheminSource, cheminArchive);
                        log.debug("Fichier {} archivé vers {}", nomFichier, cheminArchive);
                    } else {
                        // Supprimer le fichier source si pas d'archivage configuré
                        channel.rm(cheminSource);
                        log.debug("Fichier {} supprimé du répertoire d'envoi (pas d'archivage)", nomFichier);
                    }

                    // 3. Transmission pour dépôt dans les répertoires de réception
                    deliveryService.distributeFile(fileContent, nomFichier, typeFichier, config);

                    // 4. Événement de collecte (pour journalisation)
                    publierEvenementCollecte(config, nomFichier, typeFichier, taille);

                    nbCollectes++;
                    log.info("Fichier collecté avec succès : {} depuis {}",
                            nomFichier, config.getInstitutionCode());

                } catch (Exception e) {
                    log.error("Erreur lors du traitement du fichier {} de l'institution {} : {}",
                            nomFichier, config.getInstitutionCode(), e.getMessage(), e);
                    publierEvenementErreur(config, nomFichier, typeFichier, e.getMessage());
                }
            }

        } catch (Exception e) {
            log.error("Erreur de connexion SFTP à l'institution {} ({}:{}) : {}",
                    config.getInstitutionCode(), config.getSftpHost(), config.getSftpPort(), e.getMessage(), e);
            throw new RuntimeException("Connexion SFTP échouée pour " + config.getInstitutionCode(), e);
        } finally {
            connectionService.closeSftpChannel(channel);
        }

        return nbCollectes;
    }

    /**
     * Détecte le type de fichier à partir de son extension.
     */
    private String detecterTypeFichier(String nomFichier) {
        if (nomFichier == null || !nomFichier.contains(".")) return "INCONNU";
        String ext = nomFichier.substring(nomFichier.lastIndexOf('.') + 1).toUpperCase();
        return switch (ext) {
            case "MT"                    -> "MT";
            case "MX"                    -> "MX";
            case "AFB"                   -> "AFB";
            case "XLSX", "XLS"          -> "XLSX";
            case "CSV"                   -> "CSV";
            case "XML"                   -> "XML";
            case "JSON"                  -> "JSON";
            default                      -> ext;
        };
    }

    /**
     * Vérifie que le type de fichier est dans la liste des types autorisés.
     * Si la liste est vide ou null, tous les types sont acceptés.
     */
    private boolean isTypeAutorise(String typeFichier, List<String> typesAutorises) {
        if (typesAutorises == null || typesAutorises.isEmpty()) return true;
        return typesAutorises.contains(typeFichier);
    }

    private void publierEvenementCollecte(InstitutionSftpInfoDto source, String nomFichier,
                                           String typeFichier, long taille) {
        TransfertFichierEvent event = TransfertFichierEvent.builder()
                .eventId(UUID.randomUUID())
                .typeEvenement("COLLECTE")
                .institutionSourceId(source.getInstitutionId())
                .institutionSourceCode(source.getInstitutionCode())
                .institutionSourceNom(source.getInstitutionNom())
                .nomFichier(nomFichier)
                .typeFichier(typeFichier)
                .tailleFichierBytes(taille)
                .timestamp(LocalDateTime.now())
                .notificationRequise(false)
                .build();
        rabbitTemplate.convertAndSend(RabbitMQConfig.SFTP_EXCHANGE, RabbitMQConfig.SFTP_COLLECTE_KEY, event);
    }

    private void publierEvenementErreur(InstitutionSftpInfoDto source, String nomFichier,
                                         String typeFichier, String erreur) {
        TransfertFichierEvent event = TransfertFichierEvent.builder()
                .eventId(UUID.randomUUID())
                .typeEvenement("ERREUR")
                .institutionSourceId(source.getInstitutionId())
                .institutionSourceCode(source.getInstitutionCode())
                .institutionSourceNom(source.getInstitutionNom())
                .nomFichier(nomFichier)
                .typeFichier(typeFichier)
                .timestamp(LocalDateTime.now())
                .messageErreur(erreur)
                .notificationRequise(false)
                .build();
        rabbitTemplate.convertAndSend(RabbitMQConfig.SFTP_EXCHANGE, RabbitMQConfig.SFTP_ERREUR_KEY, event);
    }

    /**
     * Résultat d'une collecte SFTP.
     */
    public record CollectionResult(int totalCollectes, int totalErreurs, List<String> messages) {}
}
