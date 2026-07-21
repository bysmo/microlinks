package com.microlinks.sftp.scheduler;

import com.microlinks.sftp.service.SftpTransmissionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Planificateur de la transmission SFTP des opérations validées.
 * La fréquence de transmission est configurable via la propriété
 * {@code sftp.transmission.cron} (format cron Spring).
 *
 * Valeur par défaut : toutes les 5 minutes (en alternance/concurrence avec la collecte).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SftpTransmissionScheduler {

    private final SftpTransmissionService transmissionService;

    /**
     * Déclenche la transmission SFTP selon le cron configuré.
     */
    @Scheduled(cron = "${sftp.transmission.cron:0 */5 * * * *}")
    public void runTransmission() {
        log.info(">>> Déclenchement de la transmission SFTP planifiée <<<");
        try {
            transmissionService.runTransmission();
            log.info("Transmission SFTP planifiée exécutée avec succès.");
        } catch (Exception e) {
            log.error("Erreur inattendue lors de la transmission SFTP planifiée", e);
        }
    }
}
