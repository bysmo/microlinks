package com.microlinks.rapport.controller;

import com.microlinks.rapport.service.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClient;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.io.ByteArrayOutputStream;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@RestController
@RequestMapping("/api/v1/rapports")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Rapports & Exports", description = "Génération de rapports et exports multi-formats")
public class RapportController {

    private final ExcelExportService excelService;
    private final MT940ExportService mt940Service;
    private final CAMT053ExportService camt053Service;
    private final MT101Pain001ExportService mt101Pain001Service;
    private final WebClient.Builder webClientBuilder;

    @Value("${services.operation.url:http://operation-service:8083}")
    private String operationServiceUrl;

    @Value("${services.institution.url:http://institution-service:8082}")
    private String institutionServiceUrl;

    @GetMapping("/export/excel")
    @Operation(summary = "Exporter les opérations en Excel (.xlsx)")
    public ResponseEntity<byte[]> exportExcel(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateDebut,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFin,
            @RequestParam(required = false) String institutionId,
            @AuthenticationPrincipal Jwt jwt) {

        try {
            List<Map<String, Object>> operations = fetchOperations(dateDebut, dateFin, institutionId, jwt);
            String institutionNom = getInstitutionNom(jwt);

            byte[] data = excelService.exportOperationsExcel(operations, institutionNom, dateDebut, dateFin);

            String filename = String.format("microlinks_operations_%s_%s.xlsx",
                    dateDebut, dateFin);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .contentType(MediaType.parseMediaType(
                            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(data);

        } catch (Exception e) {
            log.error("Erreur export Excel", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/export/mt940")
    @Operation(summary = "Exporter les opérations au format MT940 (SWIFT)")
    public ResponseEntity<byte[]> exportMT940(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateDebut,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFin,
            @RequestParam(defaultValue = "") String compteCorrespondance,
            @RequestParam(defaultValue = "MLINKXXXX") String institutionBic,
            @RequestParam(required = false) String institutionId,
            @AuthenticationPrincipal Jwt jwt) {

        List<Map<String, Object>> operations = fetchOperations(dateDebut, dateFin, institutionId, jwt);
        byte[] data = mt940Service.exportMT940(operations, compteCorrespondance, institutionBic, dateDebut, dateFin);

        String filename = String.format("microlinks_mt940_%s_%s.txt", dateDebut, dateFin);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.TEXT_PLAIN)
                .body(data);
    }

    @GetMapping("/export/camt053")
    @Operation(summary = "Exporter les opérations au format CAMT.053 (ISO 20022)")
    public ResponseEntity<byte[]> exportCAMT053(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateDebut,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFin,
            @RequestParam(defaultValue = "") String compteCorrespondance,
            @RequestParam(defaultValue = "MLINKXXXX") String institutionBic,
            @RequestParam(required = false) String institutionId,
            @AuthenticationPrincipal Jwt jwt) {

        List<Map<String, Object>> operations = fetchOperations(dateDebut, dateFin, institutionId, jwt);
        String institutionNom = getInstitutionNom(jwt);

        byte[] data = camt053Service.exportCAMT053(operations, compteCorrespondance,
                institutionBic, institutionNom, dateDebut, dateFin);

        String filename = String.format("microlinks_camt053_%s_%s.xml", dateDebut, dateFin);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_XML)
                .body(data);
    }

    @GetMapping("/export/csv")
    @Operation(summary = "Exporter les opérations en CSV (fichier plat)")
    public ResponseEntity<byte[]> exportCSV(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateDebut,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFin,
            @RequestParam(required = false) String institutionId,
            @AuthenticationPrincipal Jwt jwt) {

        List<Map<String, Object>> operations = fetchOperations(dateDebut, dateFin, institutionId, jwt);

        StringBuilder csv = new StringBuilder();
        csv.append("REFERENCE;DATE;TYPE;STATUT;DONNEUR_ORDRE;INSTITUTION_EMETTRICE;COMPTE_DONNEUR;")
           .append("BENEFICIAIRE;INSTITUTION_BENEFICIAIRE;COMPTE_BENEFICIAIRE;MONTANT;DEVISE;MOTIF\n");

        for (Map<String, Object> op : operations) {
            csv.append(s(op, "referenceUnique")).append(";")
               .append(s(op, "dateOperation")).append(";")
               .append(s(op, "typeOperation")).append(";")
               .append(s(op, "statut")).append(";")
               .append(s(op, "nomDonneurOrdre")).append(";")
               .append(s(op, "nomInstitutionEmettrice")).append(";")
               .append(s(op, "compteDonneurOrdre")).append(";")
               .append(s(op, "nomBeneficiaire")).append(";")
               .append(s(op, "nomInstitutionBeneficiaire")).append(";")
               .append(s(op, "compteBeneficiaire")).append(";")
               .append(s(op, "montant")).append(";")
               .append(s(op, "devise")).append(";")
               .append(s(op, "motif").replace(";", ",")).append("\n");
        }

        byte[] data = csv.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
        String filename = String.format("microlinks_operations_%s_%s.csv", dateDebut, dateFin);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(data);
    }

    // ===== Helpers =====

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> fetchOperations(LocalDate dateDebut, LocalDate dateFin,
                                                        String institutionId, Jwt jwt) {
        try {
            String url = operationServiceUrl + "/api/v1/operations" +
                    "?dateDebut=" + dateDebut + "&dateFin=" + dateFin + "&size=10000";
            if (institutionId != null && !institutionId.isEmpty()) {
                url += "&institutionEmettriceId=" + institutionId;
            }

            return webClientBuilder.build()
                    .get()
                    .uri(url)
                    .header("Authorization", "Bearer " + jwt.getTokenValue())
                    .retrieve()
                    .bodyToMono(Map.class)
                    .map(r -> (List<Map<String, Object>>) r.getOrDefault("content", Collections.emptyList()))
                    .block();
        } catch (Exception e) {
            log.error("Erreur récupération opérations", e);
            return Collections.emptyList();
        }
    }

    private String getInstitutionNom(Jwt jwt) {
        String name = jwt.getClaimAsString("institution_nom");
        return name != null ? name : "Institution";
    }

    private String s(Map<String, Object> m, String k) {
        Object v = m.get(k);
        return v != null ? v.toString() : "";
    }

    @GetMapping("/operations/{id}/mt101")
    @Operation(summary = "Générer le message MT101 pour une opération validée")
    public ResponseEntity<?> exportMT101(
            @PathVariable String id,
            @AuthenticationPrincipal Jwt jwt) {
        try {
            Map<String, Object> operation = fetchOperationById(id, jwt);
            if (operation == null) {
                return ResponseEntity.status(404).body("Opération non trouvée");
            }

            String statut = s(operation, "statut");
            if ("BROUILLON".equals(statut) || "SOUMIS".equals(statut) || "REJETE_EMETTEUR".equals(statut) || "ANNULE".equals(statut)) {
                return ResponseEntity.badRequest().body("L'opération doit être validée par l'institution émettrice.");
            }

            String emetteurId = s(operation, "institutionEmettriceId");
            String recepteurId = s(operation, "institutionBeneficiaireId");

            String emetteurBic = fetchInstitutionBic(emetteurId, jwt);
            String recepteurBic = fetchInstitutionBic(recepteurId, jwt);

            byte[] data = mt101Pain001Service.generateMT101(operation, emetteurBic, recepteurBic);
            String filename = String.format("MT101_%s.txt", s(operation, "referenceUnique"));

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .contentType(MediaType.TEXT_PLAIN)
                    .body(data);
        } catch (Exception e) {
            log.error("Erreur génération MT101", e);
            return ResponseEntity.internalServerError().body("Erreur lors de la génération du MT101");
        }
    }

    @GetMapping("/operations/{id}/pain001")
    @Operation(summary = "Générer le fichier pain.001 pour une opération validée")
    public ResponseEntity<?> exportPain001(
            @PathVariable String id,
            @AuthenticationPrincipal Jwt jwt) {
        try {
            Map<String, Object> operation = fetchOperationById(id, jwt);
            if (operation == null) {
                return ResponseEntity.status(404).body("Opération non trouvée");
            }

            String statut = s(operation, "statut");
            if ("BROUILLON".equals(statut) || "SOUMIS".equals(statut) || "REJETE_EMETTEUR".equals(statut) || "ANNULE".equals(statut)) {
                return ResponseEntity.badRequest().body("L'opération doit être validée par l'institution émettrice.");
            }

            String emetteurId = s(operation, "institutionEmettriceId");
            String recepteurId = s(operation, "institutionBeneficiaireId");

            String emetteurBic = fetchInstitutionBic(emetteurId, jwt);
            String recepteurBic = fetchInstitutionBic(recepteurId, jwt);

            byte[] data = mt101Pain001Service.generatePain001(operation, emetteurBic, recepteurBic);
            String filename = String.format("pain_001_%s.xml", s(operation, "referenceUnique"));

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .contentType(MediaType.APPLICATION_XML)
                    .body(data);
        } catch (Exception e) {
            log.error("Erreur génération pain.001", e);
            return ResponseEntity.internalServerError().body("Erreur lors de la génération du pain.001");
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> fetchOperationById(String id, Jwt jwt) {
        try {
            String url = operationServiceUrl + "/api/v1/operations/" + id;
            return webClientBuilder.build()
                    .get()
                    .uri(url)
                    .header("Authorization", "Bearer " + jwt.getTokenValue())
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();
        } catch (Exception e) {
            log.error("Erreur récupération opération id=" + id, e);
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    private String fetchInstitutionBic(String institutionId, Jwt jwt) {
        if (institutionId == null || institutionId.isEmpty()) {
            return null;
        }
        try {
            String url = institutionServiceUrl + "/api/v1/institutions/" + institutionId;
            Map<String, Object> inst = webClientBuilder.build()
                    .get()
                    .uri(url)
                    .header("Authorization", "Bearer " + jwt.getTokenValue())
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();
            if (inst != null && inst.get("codeBic") != null) {
                return inst.get("codeBic").toString();
            }
        } catch (Exception e) {
            log.warn("Impossible de récupérer le BIC pour l'institution " + institutionId + " : " + e.getMessage());
        }
        return null;
    }

    @PostMapping("/operations/bulk/mt101")
    @Operation(summary = "Exporter les messages MT101 en vrac (ZIP)")
    public ResponseEntity<?> exportBulkMT101(
            @RequestBody List<String> ids,
            @AuthenticationPrincipal Jwt jwt) {
        try {
            if (ids == null || ids.isEmpty()) {
                return ResponseEntity.badRequest().body("La liste des identifiants ne peut pas être vide.");
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ZipOutputStream zos = new ZipOutputStream(baos);
            int addedCount = 0;

            for (String id : ids) {
                Map<String, Object> operation = fetchOperationById(id, jwt);
                if (operation == null) {
                    continue;
                }

                String statut = s(operation, "statut");
                if ("BROUILLON".equals(statut) || "SOUMIS".equals(statut) || "REJETE_EMETTEUR".equals(statut) || "ANNULE".equals(statut)) {
                    continue;
                }

                String emetteurId = s(operation, "institutionEmettriceId");
                String recepteurId = s(operation, "institutionBeneficiaireId");

                String emetteurBic = fetchInstitutionBic(emetteurId, jwt);
                String recepteurBic = fetchInstitutionBic(recepteurId, jwt);

                byte[] data = mt101Pain001Service.generateMT101(operation, emetteurBic, recepteurBic);
                String filename = String.format("MT101_%s.txt", s(operation, "referenceUnique"));

                ZipEntry zipEntry = new ZipEntry(filename);
                zos.putNextEntry(zipEntry);
                zos.write(data);
                zos.closeEntry();
                addedCount++;
            }

            zos.close();

            if (addedCount == 0) {
                return ResponseEntity.badRequest().body("Aucune opération validée éligible pour l'export.");
            }

            byte[] zipData = baos.toByteArray();
            String zipFilename = String.format("export_mt101_%s.zip", LocalDate.now());

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + zipFilename + "\"")
                    .contentType(MediaType.parseMediaType("application/zip"))
                    .body(zipData);

        } catch (Exception e) {
            log.error("Erreur lors de l'export en vrac MT101", e);
            return ResponseEntity.internalServerError().body("Erreur lors de la génération du fichier ZIP");
        }
    }

    @PostMapping("/operations/bulk/pain001")
    @Operation(summary = "Exporter les fichiers pain.001 en vrac (ZIP)")
    public ResponseEntity<?> exportBulkPain001(
            @RequestBody List<String> ids,
            @AuthenticationPrincipal Jwt jwt) {
        try {
            if (ids == null || ids.isEmpty()) {
                return ResponseEntity.badRequest().body("La liste des identifiants ne peut pas être vide.");
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ZipOutputStream zos = new ZipOutputStream(baos);
            int addedCount = 0;

            for (String id : ids) {
                Map<String, Object> operation = fetchOperationById(id, jwt);
                if (operation == null) {
                    continue;
                }

                String statut = s(operation, "statut");
                if ("BROUILLON".equals(statut) || "SOUMIS".equals(statut) || "REJETE_EMETTEUR".equals(statut) || "ANNULE".equals(statut)) {
                    continue;
                }

                String emetteurId = s(operation, "institutionEmettriceId");
                String recepteurId = s(operation, "institutionBeneficiaireId");

                String emetteurBic = fetchInstitutionBic(emetteurId, jwt);
                String recepteurBic = fetchInstitutionBic(recepteurId, jwt);

                byte[] data = mt101Pain001Service.generatePain001(operation, emetteurBic, recepteurBic);
                String filename = String.format("pain_001_%s.xml", s(operation, "referenceUnique"));

                ZipEntry zipEntry = new ZipEntry(filename);
                zos.putNextEntry(zipEntry);
                zos.write(data);
                zos.closeEntry();
                addedCount++;
            }

            zos.close();

            if (addedCount == 0) {
                return ResponseEntity.badRequest().body("Aucune opération validée éligible pour l'export.");
            }

            byte[] zipData = baos.toByteArray();
            String zipFilename = String.format("export_pain001_%s.zip", LocalDate.now());

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + zipFilename + "\"")
                    .contentType(MediaType.parseMediaType("application/zip"))
                    .body(zipData);

        } catch (Exception e) {
            log.error("Erreur lors de l'export en vrac pain.001", e);
            return ResponseEntity.internalServerError().body("Erreur lors de la génération du fichier ZIP");
        }
    }
}
