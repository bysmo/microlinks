package com.microlinks.billing.service;

import com.microlinks.billing.client.InstitutionClient;
import com.microlinks.billing.entity.*;
import com.microlinks.billing.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class FactureServiceTest {

    @Mock
    private FactureRepository factureRepository;

    @Mock
    private PaiementRepository paiementRepository;

    @Mock
    private InstitutionBillingRepository institutionBillingRepository;

    @Mock
    private TarifRepository tarifRepository;

    @Mock
    private OperationUsageRepository usageRepository;

    @Mock
    private SettingsService settingsService;

    @Mock
    private BillingNotificationPublisher notificationPublisher;

    @Mock
    private InstitutionClient institutionClient;

    @InjectMocks
    private FactureService factureService;

    private UUID institutionId;
    private UUID tarifId;
    private BillingSettings settings;

    @BeforeEach
    public void setUp() {
        institutionId = UUID.randomUUID();
        tarifId = UUID.randomUUID();

        settings = new BillingSettings();
        settings.setDelaiPaiementJours(15);
        settings.setDelaiDesactivationJours(5);
        settings.setAutoDesactivationActive(true);

        ReflectionTestUtils.setField(factureService, "defaultCurrency", "XOF");
    }

    @Test
    public void testGenererFacturesMensuelles_Forfait_Success() {
        InstitutionBilling billingConfig = InstitutionBilling.builder()
                .institutionId(institutionId)
                .institutionNom("SFD Micro")
                .modePaiement(ModePaiement.FORFAIT)
                .tarifId(tarifId)
                .actif(true)
                .build();

        Tarif tarif = Tarif.builder()
                .id(tarifId)
                .montant(new BigDecimal("75000"))
                .devise("XOF")
                .build();

        when(settingsService.get()).thenReturn(settings);
        when(institutionBillingRepository.findByActifTrue()).thenReturn(List.of(billingConfig));
        when(factureRepository.existsByInstitutionIdAndPeriode(institutionId, "2026-05")).thenReturn(false);
        when(tarifRepository.findById(tarifId)).thenReturn(Optional.of(tarif));
        when(factureRepository.save(any(Facture.class))).thenAnswer(i -> i.getArguments()[0]);

        List<Facture> result = factureService.genererFacturesMensuelles(YearMonth.of(2026, 5));

        assertThat(result).hasSize(1);
        Facture generated = result.get(0);
        assertThat(generated.getMontantTotal()).isEqualTo(new BigDecimal("75000"));
        assertThat(generated.getModePaiement()).isEqualTo(ModePaiement.FORFAIT);

        verify(notificationPublisher).publishInvoiceCreated(any(Facture.class));
    }

    @Test
    public void testGenererFacturesMensuelles_ParOperation_Success() {
        InstitutionBilling billingConfig = InstitutionBilling.builder()
                .institutionId(institutionId)
                .institutionNom("SFD Micro")
                .modePaiement(ModePaiement.PAR_OPERATION)
                .tarifId(tarifId)
                .actif(true)
                .build();

        Tarif tarif = Tarif.builder()
                .id(tarifId)
                .montant(new BigDecimal("100"))
                .devise("XOF")
                .build();

        OperationUsage usage = OperationUsage.builder()
                .institutionId(institutionId)
                .nombreOperations(250L)
                .build();

        when(settingsService.get()).thenReturn(settings);
        when(institutionBillingRepository.findByActifTrue()).thenReturn(List.of(billingConfig));
        when(factureRepository.existsByInstitutionIdAndPeriode(institutionId, "2026-05")).thenReturn(false);
        when(tarifRepository.findById(tarifId)).thenReturn(Optional.of(tarif));
        when(usageRepository.findByInstitutionIdAndPeriode(institutionId, "2026-05")).thenReturn(Optional.of(usage));
        when(factureRepository.save(any(Facture.class))).thenAnswer(i -> i.getArguments()[0]);

        List<Facture> result = factureService.genererFacturesMensuelles(YearMonth.of(2026, 5));

        assertThat(result).hasSize(1);
        Facture generated = result.get(0);
        // 250 operations * 100 FCFA = 25000 FCFA
        assertThat(generated.getMontantTotal()).isEqualTo(new BigDecimal("25000"));
        assertThat(generated.getModePaiement()).isEqualTo(ModePaiement.PAR_OPERATION);
        assertThat(generated.getNombreOperations()).isEqualTo(250L);
    }
}
