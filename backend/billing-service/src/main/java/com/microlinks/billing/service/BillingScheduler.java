package com.microlinks.billing.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import java.time.LocalDate;
import java.time.YearMonth;

/**
 * Tâches planifiées de facturation.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class BillingScheduler {

    private final FactureService factureService;
    private final SettingsService settingsService;

    /**
     * Génération automatique des factures.
     * S'exécute chaque jour à 02h00 ; ne déclenche la génération que le
     * "jour de génération" configuré, pour la période du mois précédent.
     */
    @Scheduled(cron = "${microlinks.billing.cron-generation:0 0 2 * * *}")
    public void genererFacturesMensuelles() {
        int jourGeneration = settingsService.get().getJourGeneration();
        if (LocalDate.now().getDayOfMonth() != jourGeneration) {
            return;
        }
        YearMonth periode = YearMonth.now().minusMonths(1);
        log.info("Déclenchement génération mensuelle des factures pour {}", periode);
        factureService.genererFacturesMensuelles(periode);
    }

    /**
     * Vérifie quotidiennement les factures en retard et applique la
     * désactivation automatique selon le délai configurable.
     */
    @Scheduled(cron = "${microlinks.billing.cron-overdue:0 30 2 * * *}")
    public void traiterRetards() {
        log.info("Traitement quotidien des factures en retard.");
        factureService.traiterFacturesEnRetard();
    }
}
