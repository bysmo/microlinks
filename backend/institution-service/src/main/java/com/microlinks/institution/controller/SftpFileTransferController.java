package com.microlinks.institution.controller;

import com.microlinks.institution.entity.SftpFileTransfer;
import com.microlinks.institution.repository.SftpFileTransferRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/institutions")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "SFTP File Transfers", description = "Gestion de l'historique et des statistiques des transferts SFTP")
public class SftpFileTransferController {

    private final SftpFileTransferRepository repository;

    /**
     * Enregistre un transfert de fichier SFTP (sens-to-sens).
     * Accessible par le réseau interne.
     */
    @PostMapping("/internal/sftp-transfers")
    public ResponseEntity<SftpFileTransfer> saveTransfer(@RequestBody SftpFileTransfer transfer) {
        log.info("Enregistrement du transfert SFTP: {} - Evenement: {} - Statut: {}", 
                transfer.getNomFichier(), transfer.getTypeEvenement(), transfer.getStatut());
        SftpFileTransfer saved = repository.save(transfer);
        return ResponseEntity.ok(saved);
    }

    /**
     * Liste l'historique des transferts (paginé).
     */
    @GetMapping("/internal/sftp-transfers")
    @Operation(summary = "Lister l'historique des transferts de fichiers SFTP")
    public ResponseEntity<Page<SftpFileTransfer>> getTransfers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<SftpFileTransfer> result = repository.findAllByOrderByTimestampDesc(pageable);
        return ResponseEntity.ok(result);
    }

    /**
     * Retourne les statistiques des transferts SFTP pour l'admin.
     */
    @GetMapping("/internal/sftp-transfers/stats")
    @Operation(summary = "Obtenir les statistiques globales des transferts SFTP")
    public ResponseEntity<Map<String, Object>> getStats() {
        Map<String, Object> stats = new HashMap<>();
        long total = repository.count();
        long succes = repository.countByStatut("SUCCES");
        long echec = repository.countByStatut("ECHEC");
        
        long collectes = repository.countByTypeEvenementAndStatut("COLLECTE", "SUCCES");
        long deposes = repository.countByTypeEvenementAndStatut("DEPOSE", "SUCCES");
        long erreurs = repository.countByTypeEvenementAndStatut("ERREUR", "ECHEC") + repository.countByStatut("ECHEC");

        stats.put("total", total);
        stats.put("succes", succes);
        stats.put("echec", echec);
        stats.put("collectes", collectes);
        stats.put("deposes", deposes);
        stats.put("erreurs", erreurs);

        return ResponseEntity.ok(stats);
    }
}
