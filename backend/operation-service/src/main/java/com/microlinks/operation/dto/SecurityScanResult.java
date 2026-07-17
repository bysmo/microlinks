package com.microlinks.operation.dto;

import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SecurityScanResult {
    private int totalOperationsChecked;
    private int totalHistoryLogsChecked;
    private List<String> corruptedOperationIds;
    private List<String> corruptedHistoryLogIds;
    private int totalCorruptions;
    private String status; // "SECURE", "WARNING", "CRITICAL"
    private LocalDateTime scanTimestamp;
}
