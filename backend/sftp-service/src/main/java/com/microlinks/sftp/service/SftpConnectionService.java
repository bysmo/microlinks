package com.microlinks.sftp.service;

import com.jcraft.jsch.*;
import com.microlinks.sftp.dto.InstitutionSftpInfoDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Properties;
import java.util.Vector;

/**
 * Service de connexion SFTP bas niveau utilisant la bibliothèque JSch (fork mwiede).
 *
 * Gère :
 * - Connexion par mot de passe ou clé privée SSH
 * - Listage des fichiers d'un répertoire distant
 * - Téléchargement de fichiers
 * - Dépôt de fichiers
 * - Déplacement/archivage de fichiers
 */
@Service
@Slf4j
public class SftpConnectionService {

    private static final int SESSION_TIMEOUT_MS = 30_000;
    private static final int CHANNEL_TIMEOUT_MS = 10_000;

    /**
     * Crée et retourne une session SFTP connectée pour l'institution donnée.
     * L'appelant doit fermer la session après utilisation.
     *
     * @param config Configuration SFTP de l'institution
     * @return ChannelSftp ouvert et connecté
     * @throws JSchException si la connexion échoue
     */
    public ChannelSftp openSftpChannel(InstitutionSftpInfoDto config) throws JSchException {
        JSch jsch = new JSch();

        // Authentification par clé privée si disponible
        if (config.getSftpPrivateKey() != null && !config.getSftpPrivateKey().isBlank()) {
            byte[] privateKeyBytes = config.getSftpPrivateKey().getBytes(StandardCharsets.UTF_8);
            jsch.addIdentity("institution-" + config.getInstitutionCode(),
                    privateKeyBytes, null, null);
            log.debug("Authentification SFTP par clé privée pour {}", config.getInstitutionCode());
        }

        int port = config.getSftpPort() != null ? config.getSftpPort() : 22;
        Session session = jsch.getSession(config.getSftpUser(), config.getSftpHost(), port);

        // Authentification par mot de passe si pas de clé privée
        if (config.getSftpPrivateKey() == null || config.getSftpPrivateKey().isBlank()) {
            session.setPassword(config.getSftpPassword());
            log.debug("Authentification SFTP par mot de passe pour {}", config.getInstitutionCode());
        }

        // Désactiver la vérification du host key (à activer en production avec un known_hosts)
        Properties sshConfig = new Properties();
        sshConfig.put("StrictHostKeyChecking", "no");
        session.setConfig(sshConfig);
        session.setTimeout(SESSION_TIMEOUT_MS);

        session.connect(SESSION_TIMEOUT_MS);
        log.info("Session SFTP établie vers {}:{} pour l'institution {}",
                config.getSftpHost(), port, config.getInstitutionCode());

        Channel channel = session.openChannel("sftp");
        channel.connect(CHANNEL_TIMEOUT_MS);
        return (ChannelSftp) channel;
    }

    /**
     * Ferme proprement un channel SFTP et sa session parente.
     */
    public void closeSftpChannel(ChannelSftp channel) {
        if (channel != null) {
            try {
                Session session = channel.getSession();
                channel.disconnect();
                if (session != null && session.isConnected()) {
                    session.disconnect();
                }
                log.debug("Channel SFTP fermé");
            } catch (JSchException e) {
                log.warn("Erreur lors de la fermeture du channel SFTP", e);
            }
        }
    }

    /**
     * Liste les fichiers dans un répertoire SFTP distant.
     *
     * @param channel  Channel SFTP ouvert
     * @param remotePath Chemin du répertoire distant
     * @return Liste des entrées du répertoire (hors . et ..)
     */
    @SuppressWarnings("unchecked")
    public Vector<ChannelSftp.LsEntry> listFiles(ChannelSftp channel, String remotePath) throws SftpException {
        Vector<ChannelSftp.LsEntry> entries = channel.ls(remotePath);
        entries.removeIf(e -> e.getFilename().equals(".") || e.getFilename().equals(".."));
        return entries;
    }

    /**
     * Télécharge un fichier depuis le serveur SFTP distant.
     *
     * @param channel    Channel SFTP ouvert
     * @param remotePath Chemin complet du fichier distant
     * @return Flux de données du fichier
     */
    public InputStream downloadFile(ChannelSftp channel, String remotePath) throws SftpException {
        return channel.get(remotePath);
    }

    /**
     * Dépose un fichier sur le serveur SFTP distant.
     *
     * @param channel     Channel SFTP ouvert
     * @param content     Contenu du fichier
     * @param remotePath  Chemin complet de destination
     */
    public void uploadFile(ChannelSftp channel, byte[] content, String remotePath) throws SftpException {
        channel.put(new ByteArrayInputStream(content), remotePath);
        log.debug("Fichier déposé sur SFTP : {}", remotePath);
    }

    /**
     * Déplace/renomme un fichier sur le serveur SFTP distant (utilisé pour l'archivage).
     *
     * @param channel      Channel SFTP ouvert
     * @param remoteSrc    Chemin source
     * @param remoteDst    Chemin destination
     */
    public void moveFile(ChannelSftp channel, String remoteSrc, String remoteDst) throws SftpException {
        channel.rename(remoteSrc, remoteDst);
        log.debug("Fichier déplacé de {} vers {}", remoteSrc, remoteDst);
    }

    /**
     * Crée un répertoire distant s'il n'existe pas.
     */
    public void ensureRemoteDirectoryExists(ChannelSftp channel, String remotePath) {
        try {
            channel.ls(remotePath);
        } catch (SftpException e) {
            try {
                channel.mkdir(remotePath);
                log.info("Répertoire SFTP créé : {}", remotePath);
            } catch (SftpException ex) {
                log.warn("Impossible de créer le répertoire SFTP {} : {}", remotePath, ex.getMessage());
            }
        }
    }
}
