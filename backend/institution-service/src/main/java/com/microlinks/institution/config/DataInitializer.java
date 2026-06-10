package com.microlinks.institution.config;

import com.microlinks.institution.entity.Institution;
import com.microlinks.institution.entity.StatutEntite;
import com.microlinks.institution.entity.TypeInstitution;
import com.microlinks.institution.entity.ZoneMonetaire;
import com.microlinks.institution.repository.InstitutionRepository;
import com.microlinks.institution.repository.ZoneMonetaireRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Initialise (de façon idempotente) les zones monétaires de référence, les
 * institutions par défaut
 * et les banques de la BCEAO requises au démarrage de l'application.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@Order(1)
public class DataInitializer implements ApplicationRunner {

        private final ZoneMonetaireRepository zoneMonetaireRepository;
        private final InstitutionRepository institutionRepository;

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
                                        "Zone Guinée - Franc Guinéen"));

        /**
         * Liste des banques de la zone BCEAO (UEMOA) à initialiser.
         */
        private static final List<BankSeed> BANKS = List.of(
                        // Filiales Coris Bank
                        new BankSeed("CORIBFBF", "Coris Burkina", "CORIS BANK BURKINA FASO", "BF", "BF148", "C00030148",
                                        TypeInstitution.BANQUE),
                        new BankSeed("CORIBJBJ", "Coris Bénin", "CORIS BANK BENIN", "BJ", "BJ212", "B00032121",
                                        TypeInstitution.BANQUE),
                        new BankSeed("CORICIAB", "Coris Côte d'Ivoire", "CORIS BANK COTE D'IVOIRE", "CI", "CI166",
                                        "A00031661", TypeInstitution.BANQUE),
                        new BankSeed("CORIGWGW", "Coris Guinée Bissau", "CORIS BANK GUINEE BISSAU", "GW", "GW243",
                                        "S00030967", TypeInstitution.BANQUE),
                        new BankSeed("CORIMLBA", "Coris Mali", "CORIS BANK MALI", "ML", "ML181", "D00030181",
                                        TypeInstitution.BANQUE),
                        new BankSeed("CORINENI", "Coris Niger", "CORIS BANK NIGER", "NE", "NE210", "H00032101",
                                        TypeInstitution.BANQUE),
                        new BankSeed("CORISNDA", "Coris Sénégal", "CORIS BANK SENEGAL", "SN", "SN213", "K00031971",
                                        TypeInstitution.BANQUE),
                        new BankSeed("CORITGTG", "Coris Togo", "CORIS BANK TOGO", "TG", "TG182", "T00031821",
                                        TypeInstitution.BANQUE),

                        // Autres banques émettrices de la zone UEMOA
                        new BankSeed("ECOCMLBA", "ECOBANK MALI", "ECOBANK MALI", "ML", "ML090", "D00030901",
                                        TypeInstitution.BANQUE),
                        new BankSeed("ECOCBFBF", "ECOBANK BURKINA", "ECOBANK BURKINA", "BF", "BF083", "C00030831",
                                        TypeInstitution.BANQUE),
                        new BankSeed("ECOCSNDA", "ECOBANK SENEGAL", "ECOBANK SENEGAL", "SN", "SN097", "K00030971",
                                        TypeInstitution.BANQUE),
                        new BankSeed("ECOCCIAB", "ECOBANK COTE D'IVOIRE", "ECOBANK COTE D'IVOIRE", "CI", "CI066",
                                        "A00030661", TypeInstitution.BANQUE),
                        new BankSeed("SGBFBFBF", "SOCIETE GENERALE BURKINA", "SOCIETE GENERALE BURKINA", "BF", "BF024",
                                        "C00030248", TypeInstitution.BANQUE),
                        new BankSeed("SGMLMLBA", "SOCIETE GENERALE MALI", "SOCIETE GENERALE MALI", "ML", "ML028",
                                        "D00030281", TypeInstitution.BANQUE),
                        new BankSeed("BBICBFBF", "BANK OF AFRICA BURKINA", "BANK OF AFRICA BURKINA", "BF", "BF034",
                                        "C00030348", TypeInstitution.BANQUE),
                        new BankSeed("BICIMLBA", "BANK OF AFRICA MALI", "BANK OF AFRICA MALI", "ML", "ML038",
                                        "D00030381", TypeInstitution.BANQUE),
                        new BankSeed("ATCOBFBF", "ATLANTIC BANK BURKINA", "ATLANTIC BANK BURKINA", "BF", "BF044",
                                        "C00030448", TypeInstitution.BANQUE),
                        new BankSeed("ATCOMLBA", "ATLANTIC BANK MALI", "ATLANTIC BANK MALI", "ML", "ML048", "D00030481",
                                        TypeInstitution.BANQUE));

        @Override
        @Transactional
        public void run(ApplicationArguments args) {
                // 1. Initialiser les zones monétaires
                int zonesCreated = 0;
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
                                zonesCreated++;
                                log.info("Zone monétaire de référence créée : {} ({})", seed.code(), seed.devise());
                        }
                }

                ZoneMonetaire bceao = zoneMonetaireRepository.findByCode("BCEAO")
                                .orElseThrow(() -> new IllegalStateException(
                                                "Zone monétaire BCEAO introuvable après initialisation"));

                // 2. Initialiser les institutions par défaut liées aux comptes de démo Keycloak
                seedDefaultInstitution(
                                UUID.fromString("b3d829b3-3f66-57bb-94b4-e8fcd5023de4"),
                                "BANK-ATLANTIC",
                                "Banque Atlantique",
                                "Banque Atlantique Ouest",
                                "CI",
                                "CI046",
                                "ATLANTIQUE",
                                "A00030461",
                                TypeInstitution.BANQUE,
                                bceao);

                seedDefaultInstitution(
                                UUID.fromString("a2c918a2-2e55-46aa-83a3-d7efc4912cd3"),
                                "MESO-OUEST",
                                "MesoFinance Ouest",
                                "MesoFinance de l'Ouest",
                                "CI",
                                "CI199",
                                "MESOUEST",
                                null,
                                TypeInstitution.MESO_FINANCE,
                                bceao);

                // 3. Initialiser les banques BCEAO
                int banksCreated = 0;
                for (BankSeed seed : BANKS) {
                        if (!institutionRepository.existsByCode(seed.bic())) {
                                // Générer un UUID stable basé sur le BIC
                                UUID generatedId = UUID.nameUUIDFromBytes(("BCEAO-BANK-" + seed.bic()).getBytes());

                                // Prévention de collision d'UUID au cas où
                                if (institutionRepository.existsById(generatedId)) {
                                        generatedId = UUID.randomUUID();
                                }

                                String cleanName = seed.name().toLowerCase().replaceAll("\\s+", "");
                                Institution bank = Institution.builder()
                                                .id(generatedId)
                                                .code(seed.bic())
                                                .sigle(seed.name())
                                                .nom(seed.fullName())
                                                .pays(seed.country())
                                                .typeInstitution(seed.type())
                                                .zoneMonetaire(bceao)
                                                .codeBanqueRegional(seed.countryCode())
                                                .codeBic(seed.bic())
                                                .codeParticipantRtgs(seed.rtgsCode())
                                                .statut(StatutEntite.INACTIF)
                                                .dateAdhesion(LocalDate.of(2024, 1, 1))
                                                .adresse("Siège social, " + seed.name())
                                                .telephone("+221 33 800 00 00")
                                                .email("contact@" + cleanName + ".com")
                                                .siteWeb("www." + cleanName + ".com")
                                                .createdBy("system")
                                                .updatedBy("system")
                                                .build();

                                institutionRepository.save(bank);
                                banksCreated++;
                                log.info("Banque de référence BCEAO créée : {} - {} ({})", seed.bic(), seed.fullName(),
                                                seed.country());
                        }
                }

                if (zonesCreated > 0 || banksCreated > 0) {
                        log.info("Initialisation de référence terminée. Zones créées: {}, Banques créées: {}.",
                                        zonesCreated, banksCreated);
                } else {
                        log.info("Référentiels (zones et banques) déjà à jour. Aucune action requise.");
                }
        }

        private void seedDefaultInstitution(UUID id, String code, String sigle, String nom, String country,
                        String countryCode, String bic, String rtgsCode,
                        TypeInstitution type, ZoneMonetaire zone) {
                if (institutionRepository.findById(id).isEmpty() && !institutionRepository.existsByCode(code)) {
                        String cleanName = sigle.toLowerCase().replaceAll("\\s+", "");
                        Institution inst = Institution.builder()
                                        .id(id)
                                        .code(code)
                                        .sigle(sigle)
                                        .nom(nom)
                                        .pays(country)
                                        .typeInstitution(type)
                                        .zoneMonetaire(zone)
                                        .codeBanqueRegional(countryCode)
                                        .codeBic(bic)
                                        .codeParticipantRtgs(rtgsCode)
                                        .statut(StatutEntite.ACTIF)
                                        .dateAdhesion(LocalDate.of(2024, 1, 1))
                                        .adresse("Abidjan, Côte d'Ivoire")
                                        .telephone("+225 27 20 00 00")
                                        .email("info@" + cleanName + ".com")
                                        .siteWeb("www." + cleanName + ".com")
                                        .createdBy("system")
                                        .updatedBy("system")
                                        .build();
                        institutionRepository.save(inst);
                        log.info("Institution par défaut créée : {} - {}", code, nom);
                }
        }

        private record ZoneSeed(String code, String libelle, String devise, String description) {
        }

        private record BankSeed(String bic, String name, String fullName, String country, String countryCode,
                        String rtgsCode, TypeInstitution type) {
        }
}
