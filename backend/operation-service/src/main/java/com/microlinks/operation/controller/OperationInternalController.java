package com.microlinks.operation.controller;
 
import com.microlinks.operation.dto.OperationDto;
import com.microlinks.operation.entity.StatutOperation;
import com.microlinks.operation.service.OperationService;
import io.swagger.v3.oas.annotations.Hidden;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
 
import java.util.List;
import java.util.Map;
import java.util.UUID;
 
/**
 * Contrôleur interne pour les échanges de service à service (sftp-service -> operation-service).
 * Cet API est masqué de Swagger et restreint par la gateway réseau.
 */
@RestController
@RequestMapping("/api/v1/operations/internal")
@RequiredArgsConstructor
@Slf4j
@Hidden
public class OperationInternalController {
 
    private final OperationService operationService;
 
    /**
     * Récupère toutes les opérations prêtes pour transmission SFTP (statut ACCEPTE_BANQUE_EMETTRICE).
     */
    @GetMapping("/to-transmit")
    public ResponseEntity<List<OperationDto>> getOperationsToTransmit() {
        log.debug("Requête interne: récupération des opérations à transmettre");
        List<OperationDto> ops = operationService.findByStatut(StatutOperation.ACCEPTE_BANQUE_EMETTRICE);
        return ResponseEntity.ok(ops);
    }
 
    /**
     * Met à jour en lot le statut des opérations indiquées.
     */
    @PutMapping("/status")
    public ResponseEntity<Void> updateStatusBatch(
            @RequestParam StatutOperation nouveauStatut,
            @RequestBody List<UUID> ids) {
        log.info("Requête interne: mise à jour en lot vers {} pour {} opération(s)", nouveauStatut, ids.size());
        operationService.updateStatusBatch(ids, nouveauStatut, "SYSTEM", "SFTP Service");
        return ResponseEntity.ok().build();
    }
}
