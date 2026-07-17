package com.microlinks.billing.service;

import com.microlinks.billing.client.InstitutionClient;
import com.microlinks.billing.dto.PaiementRequest;
import com.microlinks.billing.entity.*;
import com.microlinks.billing.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Logique métier de facturation : génération mensuelle, calcul selon le mode
 * de paiement, émission/livraison, enregistrement des paiements et désactivation.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FactureService {

    private final FactureRepository factureRepository;
    private final PaiementRepository paiementRepository;
    private final InstitutionBillingRepository institutionBillingRepository;
    private final TarifRepository tarifRepository;
    private final OperationUsageRepository usageRepository;
    private final SettingsService settingsService;
    private final BillingNotificationPublisher notificationPublisher;
    private final InstitutionClient institutionClient;

    @Value("${microlinks.billing.currency-default:XOF}")
    private String defaultCurrency;

    public List<Facture> findAll() {
        return factureRepository.findAllByOrderByCreatedAtDesc();
    }

    public List<Facture> findByInstitution(UUID institutionId) {
        return factureRepository.findByInstitutionIdOrderByCreatedAtDesc(institutionId);
    }

    public Facture findById(UUID id) {
        return factureRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Facture introuvable: " + id));
    }

    public List<Paiement> getPaiements(UUID factureId) {
        return paiementRepository.findByFactureIdOrderByDatePaiementDesc(factureId);
    }

    /**
     * Génère les factures du mois précédent pour toutes les institutions configurées.
     * Idempotent : ne régénère pas une facture déjà existante pour la période.
     */
    @Transactional
    public List<Facture> genererFacturesMensuelles(YearMonth periode) {
        List<Facture> generees = new ArrayList<>();
        BillingSettings settings = settingsService.get();
        List<InstitutionBilling> configs = institutionBillingRepository.findByActifTrue();

        for (InstitutionBilling cfg : configs) {
            try {
                if (factureRepository.existsByInstitutionIdAndPeriode(cfg.getInstitutionId(), periode.toString())) {
                    continue;
                }
                Facture facture = calculerFacture(cfg, periode, settings);
                if (facture != null) {
                    facture = factureRepository.save(facture);
                    notificationPublisher.publishInvoiceCreated(facture);
                    generees.add(facture);
                }
            } catch (Exception e) {
                log.error("Erreur génération facture institution {}: {}", cfg.getInstitutionId(), e.getMessage());
            }
        }
        log.info("{} facture(s) générée(s) pour la période {}", generees.size(), periode);
        return generees;
    }

    private Facture calculerFacture(InstitutionBilling cfg, YearMonth periode, BillingSettings settings) {
        Tarif tarif = cfg.getTarifId() != null
                ? tarifRepository.findById(cfg.getTarifId()).orElse(null) : null;

        BigDecimal montantTotal;
        Long nombreOperations = null;
        BigDecimal montantUnitaire = null;
        String devise = tarif != null ? tarif.getDevise() : defaultCurrency;

        if (cfg.getModePaiement() == ModePaiement.PAR_OPERATION) {
            long count = usageRepository
                    .findByInstitutionIdAndPeriode(cfg.getInstitutionId(), periode.toString())
                    .map(OperationUsage::getNombreOperations)
                    .orElse(0L);
            nombreOperations = count;
            montantUnitaire = tarif != null ? tarif.getMontant() : BigDecimal.ZERO;
            montantTotal = montantUnitaire.multiply(BigDecimal.valueOf(count));
        } else { // FORFAIT
            montantTotal = tarif != null ? tarif.getMontant() : BigDecimal.ZERO;
        }

        LocalDate dateEmission = LocalDate.now();
        LocalDate dateEcheance = dateEmission.plusDays(settings.getDelaiPaiementJours());
        LocalDate dateLimiteDesactivation = dateEcheance.plusDays(settings.getDelaiDesactivationJours());

        return Facture.builder()
                .numero(genererNumero(periode))
                .institutionId(cfg.getInstitutionId())
                .institutionNom(cfg.getInstitutionNom())
                .institutionEmail(cfg.getInstitutionEmail())
                .periode(periode.toString())
                .periodeDebut(periode.atDay(1))
                .periodeFin(periode.atEndOfMonth())
                .modePaiement(cfg.getModePaiement())
                .nombreOperations(nombreOperations)
                .montantUnitaire(montantUnitaire)
                .montantTotal(montantTotal)
                .montantPaye(BigDecimal.ZERO)
                .devise(devise)
                .statut(StatutFacture.EMISE)
                .dateEmission(dateEmission)
                .dateEcheance(dateEcheance)
                .dateLimiteDesactivation(dateLimiteDesactivation)
                .build();
    }

    private String genererNumero(YearMonth periode) {
        String base = "FAC-" + periode.toString().replace("-", "") + "-";
        return base + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
    }

    /** Enregistre un paiement et met à jour le statut de la facture. */
    @Transactional
    public Facture enregistrerPaiement(UUID factureId, PaiementRequest req, String user) {
        Facture facture = findById(factureId);
        Paiement paiement = Paiement.builder()
                .factureId(factureId)
                .montant(req.getMontant())
                .datePaiement(req.getDatePaiement() != null ? req.getDatePaiement() : LocalDate.now())
                .moyenPaiement(req.getMoyenPaiement())
                .reference(req.getReference())
                .commentaire(req.getCommentaire())
                .createdBy(user)
                .build();
        paiementRepository.save(paiement);

        BigDecimal totalPaye = (facture.getMontantPaye() == null ? BigDecimal.ZERO : facture.getMontantPaye())
                .add(req.getMontant());
        facture.setMontantPaye(totalPaye);
        if (totalPaye.compareTo(facture.getMontantTotal()) >= 0) {
            facture.setStatut(StatutFacture.PAYEE);
            facture.setDatePaiement(paiement.getDatePaiement());
        }
        return factureRepository.save(facture);
    }

    @Transactional
    public Facture annuler(UUID factureId) {
        Facture facture = findById(factureId);
        facture.setStatut(StatutFacture.ANNULEE);
        return factureRepository.save(facture);
    }

    /**
     * Marque comme EN_RETARD les factures échues impayées et désactive
     * automatiquement les institutions dont le délai de grâce est dépassé.
     */
    @Transactional
    public void traiterFacturesEnRetard() {
        BillingSettings settings = settingsService.get();
        LocalDate today = LocalDate.now();
        List<StatutFacture> impayes = List.of(StatutFacture.EMISE, StatutFacture.EN_RETARD);

        // 1. Passer en EN_RETARD les factures échues
        for (Facture f : factureRepository.findByStatutInAndDateEcheanceBefore(
                List.of(StatutFacture.EMISE), today)) {
            f.setStatut(StatutFacture.EN_RETARD);
            factureRepository.save(f);
            notificationPublisher.publishInvoiceOverdue(f);
        }

        // 2. Désactivation automatique après le délai configurable
        if (Boolean.TRUE.equals(settings.getAutoDesactivationActive())) {
            for (Facture f : factureRepository.findByStatutInAndDateLimiteDesactivationBefore(
                    impayes, today)) {
                boolean ok = institutionClient.desactiverInstitution(f.getInstitutionId());
                if (ok) {
                    notificationPublisher.publishInstitutionDeactivated(f);
                }
            }
        }
    }
}
