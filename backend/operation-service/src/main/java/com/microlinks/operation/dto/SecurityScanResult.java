package com.microlinks.operation.dto;

import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Résultat du scan d'audit de sécurité, de conformité et d'intégrité
 * cryptographique des transactions et de leur historique.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SecurityScanResult {
    private int totalOperationsChecked;
    private int totalHistoryLogsChecked;
    private List<String> corruptedOperationIds;
    private List<String> corruptedHistoryLogIds;
    private List<String> corruptedBlockchainIds;
    private String merkleRoot;
    private int totalCorruptions;
    private String status; // "SECURE", "WARNING", "CRITICAL"
    private LocalDateTime scanTimestamp;
}
