package com.microlinks.billing.service;

import com.microlinks.billing.entity.OperationUsage;
import com.microlinks.billing.repository.OperationUsageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.time.YearMonth;
import java.util.Map;
import java.util.UUID;

/**
 * Consomme les événements opération et incrémente le compteur d'opérations
 * facturables (statut "billable") par institution émettrice et par mois.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class UsageConsumer {

    private final OperationUsageRepository usageRepository;

    @Value("${microlinks.billing.billable-status:COMPTABILISE}")
    private String billableStatus;

    @RabbitListener(queues = "microlinks.billing.operations.queue")
    @Transactional
    public void handleOperationEvent(Map<String, Object> event) {
        try {
            String statutApres = (String) event.get("statutApres");
            if (statutApres == null || !statutApres.equalsIgnoreCase(billableStatus)) {
                return;
            }
            Object instId = event.get("institutionEmettriceId");
            if (instId == null) return;

            UUID institutionId = UUID.fromString(instId.toString());
            String periode = YearMonth.now().toString(); // YYYY-MM

            OperationUsage usage = usageRepository
                    .findByInstitutionIdAndPeriode(institutionId, periode)
                    .orElseGet(() -> OperationUsage.builder()
                            .institutionId(institutionId)
                            .periode(periode)
                            .nombreOperations(0L)
                            .build());
            usage.setNombreOperations(usage.getNombreOperations() + 1);
            usageRepository.save(usage);
            log.debug("Usage incrémenté institution={} periode={} total={}",
                    institutionId, periode, usage.getNombreOperations());
        } catch (Exception e) {
            log.warn("Erreur traitement événement opération pour usage facturation: {}", e.getMessage());
        }
    }
}
