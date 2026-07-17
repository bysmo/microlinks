package com.microlinks.sftp;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * MicroLinks SFTP Service
 *
 * Microservice dédié aux échanges sécurisés de fichiers de transactions
 * (MT, MX, AFB, XLSX, CSV, XML, JSON) entre la plateforme et les institutions
 * financières via SFTP.
 *
 * Responsabilités :
 * - Collecter les fichiers déposés par les institutions dans leurs répertoires d'envoi
 * - Archiver les fichiers source après traitement
 * - Déposer les fichiers générés dans les répertoires de réception des institutions
 * - Publier des événements RabbitMQ pour les notifications email
 */
@SpringBootApplication
@EnableScheduling
public class SftpServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(SftpServiceApplication.class, args);
    }
}
