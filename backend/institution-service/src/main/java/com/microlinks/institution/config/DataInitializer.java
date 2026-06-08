package com.microlinks.institution.config;

import com.microlinks.institution.entity.StatutEntite;
import com.microlinks.institution.entity.ZoneMonetaire;
import com.microlinks.institution.repository.ZoneMonetaireRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Initialise (de façon idempotente) les zones monétaires de référence au démarrage
 * de l'application.
 *
 * <p>Liquibase ({@code 005-insert-initial-data.xml}) insère ces zones lors de la
 * première migration, mais un changeSet Liquibase ne s'exécute qu'une seule fois :
 * si la base a été créée avant l'ajout du changeSet, ou si les lignes ont été
 * supprimées manuellement, les zones n'existeraient plus et le frontend afficherait
 * "Erreur lors du chargement des référentiels (zones/banques)".
 *
 * <p>Cet initialiseur garantit que les zones obligatoires (BCEAO, BEAC, BCRG ...)
 * existent toujours, indépendamment de l'état des migrations Liquibase. Il est
 * strictement idempotent : il n'insère une zone que si son {@code code} est absent.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@Order(1)
public class DataInitializer implements ApplicationRunner {

    private final ZoneMonetaireRepository zoneMonetaireRepository;

    /**
     * Zones monétaires de référence requises par la plateforme MicroLinks.
     * Les trois premières (BCEAO, BEAC, BCRG) sont obligatoires.
     */
    private static final List<ZoneSeed> ZONES = List.of(
            new ZoneSeed("BCEAO", "Banque Centrale des États de l'Afrique de l'Ouest", "XOF",
                    "Zone UEMOA - Franc CFA Ouest-Africain"),
            new ZoneSeed("BEAC", "Banque des États de l'Afrique Centrale", "XAF",
                    "Zone CEMAC - Franc CFA d'Afrique Centrale"),
            new ZoneSeed("BCRG", "Banque Centrale de la République de Guinée", "GNF",
                    "Zone Guinée - Franc Guinéen"),
            new ZoneSeed("BNR", "Banque Nationale du Rwanda", "RWF",
                    "Zone Rwanda - Franc Rwandais"),
            new ZoneSeed("BCC", "Banque Centrale du Congo", "CDF",
                    "Zone RDC - Franc Congolais")
    );

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        int created = 0;
        for (ZoneSeed seed : ZONES) {
            if (zoneMonetaireRepository.findByCode(seed.code()).isEmpty()) {
                ZoneMonetaire zone = ZoneMonetaire.builder()
                        .code(seed.code())
                        .libelle(seed.libelle())
                        .devise(seed.devise())
                        .description(seed.description())
                        .statut(StatutEntite.ACTIF)
                        .build();
                zoneMonetaireRepository.save(zone);
                created++;
                log.info("Zone monétaire de référence créée : {} ({})", seed.code(), seed.devise());
            }
        }
        long total = zoneMonetaireRepository.count();
        if (created > 0) {
            log.info("Initialisation des zones monétaires terminée : {} créée(s), {} au total.", created, total);
        } else {
            log.info("Zones monétaires déjà présentes ({} au total), aucune création nécessaire.", total);
        }
    }

    /** Données de référence d'une zone monétaire. */
    private record ZoneSeed(String code, String libelle, String devise, String description) {
    }
}
