package com.microlinks.sftp.scheduler;

import com.microlinks.sftp.service.SftpCollectorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Planificateur de la collecte SFTP.
 *
 * La fréquence de collecte est configurable via la propriété
 * {@code sftp.polling.cron} (format cron Spring).
 *
 * Valeur par défaut : toutes les 5 minutes.
 *
 * Exemples de valeurs configurables par l'admin SaaS :
 *   - Toutes les 5 min  : 0 *\/5 * * * *
 *   - Toutes les heures : 0 0 * * * *
 *   - Toutes les 30 min : 0 *\/30 * * * *
 *   - 1x par jour à 8h  : 0 0 8 * * *
 *
 * La valeur est définie via la variable d'environnement SFTP_POLLING_CRON
 * dans docker-compose.yml et peut être modifiée sans recompilation.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SftpPollingScheduler {

    private final SftpCollectorService collectorService;

    /**
     * Déclenche la collecte SFTP selon le cron configuré.
     * L'expression cron est lue depuis {@code sftp.polling.cron} ;
     * le fallback est "toutes les 5 minutes".
     */
    @Scheduled(cron = "${sftp.polling.cron:0 */5 * * * *}")
    public void pollAllInstitutions() {
        log.info(">>> Déclenchement de la collecte SFTP planifiée <<<");
        try {
            SftpCollectorService.CollectionResult result = collectorService.collectAllInstitutions();
            log.info("Collecte SFTP terminée : {} fichier(s) collecté(s), {} erreur(s)",
                    result.totalCollectes(), result.totalErreurs());
            if (!result.messages().isEmpty()) {
                result.messages().forEach(msg -> log.warn("  - {}", msg));
            }
        } catch (Exception e) {
            log.error("Erreur inattendue lors de la collecte SFTP planifiée", e);
        }
    }
}
