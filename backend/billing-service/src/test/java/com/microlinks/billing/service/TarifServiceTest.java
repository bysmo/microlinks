package com.microlinks.billing.service;

import com.microlinks.billing.dto.TarifRequest;
import com.microlinks.billing.entity.ModePaiement;
import com.microlinks.billing.entity.Tarif;
import com.microlinks.billing.repository.TarifRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class TarifServiceTest {

    @Mock
    private TarifRepository tarifRepository;

    @InjectMocks
    private TarifService tarifService;

    @Test
    public void testCreateTarif_Success() {
        TarifRequest req = new TarifRequest();
        req.setCode("FORFAIT_STANDARD");
        req.setLibelle("Forfait Standard");
        req.setModePaiement(ModePaiement.FORFAIT);
        req.setMontant(new BigDecimal("50000"));
        req.setDevise("XOF");
        req.setActif(true);

        Tarif mockSaved = Tarif.builder()
                .id(UUID.randomUUID())
                .code("FORFAIT_STANDARD")
                .libelle("Forfait Standard")
                .modePaiement(ModePaiement.FORFAIT)
                .montant(new BigDecimal("50000"))
                .devise("XOF")
                .actif(true)
                .build();

        when(tarifRepository.save(any(Tarif.class))).thenReturn(mockSaved);

        Tarif result = tarifService.create(req, "admin");

        assertThat(result).isNotNull();
        assertThat(result.getCode()).isEqualTo("FORFAIT_STANDARD");
        assertThat(result.getMontant()).isEqualTo(new BigDecimal("50000"));
    }

    @Test
    public void testUpdateTarif_Success() {
        UUID tarifId = UUID.randomUUID();
        Tarif existing = Tarif.builder()
                .id(tarifId)
                .code("FORFAIT_STANDARD")
                .libelle("Forfait Standard")
                .build();

        TarifRequest req = new TarifRequest();
        req.setCode("FORFAIT_PREMIUM");
        req.setLibelle("Forfait Premium");
        req.setMontant(new BigDecimal("100000"));

        when(tarifRepository.findById(tarifId)).thenReturn(Optional.of(existing));
        when(tarifRepository.save(any(Tarif.class))).thenReturn(existing);

        Tarif result = tarifService.update(tarifId, req);

        assertThat(result).isNotNull();
        assertThat(result.getCode()).isEqualTo("FORFAIT_PREMIUM");
        assertThat(result.getLibelle()).isEqualTo("Forfait Premium");
    }
}
