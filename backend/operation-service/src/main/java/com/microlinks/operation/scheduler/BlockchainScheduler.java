package com.microlinks.operation.scheduler;

import com.microlinks.operation.dto.SecurityScanResult;
import com.microlinks.operation.service.OperationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Tâche planifiée en arrière-plan chargée d'exécuter des scans d'intégrité
 * réguliers sur la blockchain des opérations et des historiques de transactions.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class BlockchainScheduler {

    private final OperationService operationService;

    /**
     * Exécute un scan d'intégrité cryptographique toutes les 10 minutes.
     * Alerte dans les fichiers de logs en cas d'altération détectée.
     */
    @Scheduled(fixedRate = 600000) // 10 minutes (600 000 ms)
    public void checkBlockchainIntegrity() {
        log.info("Début du contrôle d'intégrité périodique de la blockchain des transactions...");
        try {
            SecurityScanResult result = operationService.runSecurityScan();
            if (!"SECURE".equals(result.getStatus())) {
                log.error("[ALERTE DE SÉCURITÉ - CRITIQUE] Corruption détectée dans le grand livre des transactions ! " +
                        "Total anomalies : {}, Racine Merkle actuelle : {}", 
                        result.getTotalCorruptions(), result.getMerkleRoot());
                
                if (result.getCorruptedOperationIds() != null && !result.getCorruptedOperationIds().isEmpty()) {
                    log.error("Opérations corrompues : {}", result.getCorruptedOperationIds());
                }
                if (result.getCorruptedBlockchainIds() != null && !result.getCorruptedBlockchainIds().isEmpty()) {
                    log.error("Liens blockchain corrompus : {}", result.getCorruptedBlockchainIds());
                }
                if (result.getCorruptedHistoryLogIds() != null && !result.getCorruptedHistoryLogIds().isEmpty()) {
                    log.error("Historique de statuts corrompu : {}", result.getCorruptedHistoryLogIds());
                }
            } else {
                log.info("Scan d'intégrité réussi : Blockchain saine. Racine de Merkle : {}", result.getMerkleRoot());
            }
        } catch (Exception e) {
            log.error("Erreur lors de l'exécution du scan d'intégrité de la blockchain", e);
        }
    }
}
