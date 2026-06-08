package com.microlinks.billing.service;

import com.microlinks.billing.entity.BillingSettings;
import com.microlinks.billing.entity.ModePaiement;
import com.microlinks.billing.entity.Tarif;
import com.microlinks.billing.repository.BillingSettingsRepository;
import com.microlinks.billing.repository.TarifRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import java.math.BigDecimal;

/**
 * Initialise les paramètres de facturation par défaut et quelques tarifs de démonstration.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements ApplicationRunner {

    private final BillingSettingsRepository settingsRepository;
    private final TarifRepository tarifRepository;

    @Override
    public void run(ApplicationArguments args) {
        if (settingsRepository.findById(1).isEmpty()) {
            settingsRepository.save(BillingSettings.builder()
                    .id(1)
                    .delaiDesactivationJours(15)
                    .autoDesactivationActive(true)
                    .jourGeneration(1)
                    .delaiPaiementJours(30)
                    .updatedBy("system")
                    .build());
            log.info("Paramètres de facturation par défaut initialisés.");
        }

        if (tarifRepository.count() == 0) {
            tarifRepository.save(Tarif.builder()
                    .code("OP-STD")
                    .libelle("Tarif standard par opération")
                    .description("Facturation à l'opération comptabilisée")
                    .modePaiement(ModePaiement.PAR_OPERATION)
                    .montant(new BigDecimal("250.00"))
                    .devise("XOF")
                    .actif(true)
                    .createdBy("system")
                    .build());
            tarifRepository.save(Tarif.builder()
                    .code("FORF-MENS")
                    .libelle("Forfait mensuel")
                    .description("Abonnement mensuel à montant fixe")
                    .modePaiement(ModePaiement.FORFAIT)
                    .montant(new BigDecimal("150000.00"))
                    .devise("XOF")
                    .actif(true)
                    .createdBy("system")
                    .build());
            log.info("Tarifs de démonstration initialisés.");
        }
    }
}
