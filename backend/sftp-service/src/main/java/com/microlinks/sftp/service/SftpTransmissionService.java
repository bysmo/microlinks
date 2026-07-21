package com.microlinks.sftp.service;

import com.jcraft.jsch.ChannelSftp;
import com.microlinks.sftp.client.InstitutionSftpClient;
import com.microlinks.sftp.client.OperationClient;
import com.microlinks.sftp.dto.InstitutionSftpInfoDto;
import com.microlinks.sftp.dto.OperationDto;
import com.microlinks.sftp.dto.SftpFileTransferDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SftpTransmissionService {

    private final OperationClient operationClient;
    private final InstitutionSftpClient institutionClient;
    private final SftpConnectionService connectionService;

    /**
     * Exécute le processus de transmission des opérations validées.
     */
    public void runTransmission() {
        log.info(">>> Début de la transmission SFTP des opérations validées <<<");

        // 1. Récupérer toutes les opérations prêtes pour la transmission
        List<OperationDto> operations = operationClient.getOperationsToTransmit();
        if (operations.isEmpty()) {
            log.info("Aucune opération en attente de transmission.");
            return;
        }

        log.info("{} opération(s) trouvée(s) en attente de transmission.", operations.size());

        // 2. Récupérer toutes les configurations SFTP actives
        List<InstitutionSftpInfoDto> activeConfigs = institutionClient.getAllActiveInstitutionsSftpConfig();

        // 3. Grouper les opérations par institution destinataire (bénéficiaire)
        Map<UUID, List<OperationDto>> groupedOps = operations.stream()
                .filter(op -> op.getInstitutionBeneficiaireId() != null)
                .collect(Collectors.groupingBy(OperationDto::getInstitutionBeneficiaireId));

        for (Map.Entry<UUID, List<OperationDto>> entry : groupedOps.entrySet()) {
            UUID destId = entry.getKey();
            List<OperationDto> ops = entry.getValue();

            // Trouver la config SFTP du destinataire
            InstitutionSftpInfoDto config = activeConfigs.stream()
                    .filter(c -> c.getInstitutionId().equals(destId))
                    .findFirst()
                    .orElse(null);

            if (config == null) {
                log.warn("Institution bénéficiaire ID {} sans configuration SFTP active ou complète. {} opération(s) ignorée(s).",
                        destId, ops.size());
                continue;
            }

            // Exécuter la transmission pour ce destinataire
            transmitToInstitution(config, ops);
        }

        log.info(">>> Fin du cycle de transmission SFTP <<<");
    }

    private void transmitToInstitution(InstitutionSftpInfoDto config, List<OperationDto> operations) {
        log.info("Transmission de {} opération(s) vers l'établissement : {}", operations.size(), config.getInstitutionCode());
        List<UUID> opIds = operations.stream().map(OperationDto::getId).collect(Collectors.toList());

        // 1. Passer temporairement en statut TRANSMISSING
        try {
            operationClient.updateOperationsStatus(opIds, "TRANSMISSING");
        } catch (Exception e) {
            log.error("Impossible de passer les opérations en statut TRANSMISSING pour {}. Abandon.", config.getInstitutionCode(), e);
            return;
        }

        // 2. Déterminer le format de fichier (ENTRÉE) et générer le contenu
        String format = config.getTypeFichierEntree() != null ? config.getTypeFichierEntree().toUpperCase() : "JSON";
        byte[] fileContent = generateFileContent(operations, format);
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        String extension = format.toLowerCase();
        String nomFichier = String.format("ML_TRANS_%s_%s.%s", config.getInstitutionCode(), timestamp, extension);

        // 3. Etablir la connexion et déposer le fichier
        ChannelSftp channel = null;
        boolean success = false;
        String errorMessage = null;
        String pathDest = null;

        try {
            // Construire une configuration de connexion spécifique pour le sens ENTRÉE
            InstitutionSftpInfoDto connConfig = new InstitutionSftpInfoDto();
            connConfig.setInstitutionCode(config.getInstitutionCode());
            connConfig.setSftpHost(config.getSftpHost());
            connConfig.setSftpPort(config.getPortEntree() != null ? config.getPortEntree() : (config.getSftpPort() != null ? config.getSftpPort() : 22));
            connConfig.setSftpUser(config.getUtilisateurEntree() != null ? config.getUtilisateurEntree() : config.getSftpUser());
            connConfig.setSftpPassword(config.getMotDePasseEntree() != null ? config.getMotDePasseEntree() : config.getSftpPassword());
            connConfig.setSftpPrivateKey(config.getSftpPrivateKey());

            String targetDir = config.getRepertoireEntree() != null ? config.getRepertoireEntree() : config.getSftpRepertoireReception();
            if (targetDir == null || targetDir.isBlank()) {
                targetDir = "/reception";
            }

            channel = connectionService.openSftpChannel(connConfig);
            connectionService.ensureRemoteDirectoryExists(channel, targetDir);

            pathDest = targetDir + "/" + nomFichier;
            connectionService.uploadFile(channel, fileContent, pathDest);
            success = true;

            log.info("Fichier déposé avec succès chez {} : {}", config.getInstitutionCode(), pathDest);

        } catch (Exception e) {
            errorMessage = e.getMessage();
            log.error("Échec de la transmission SFTP chez {} : {}", config.getInstitutionCode(), errorMessage, e);
        } finally {
            if (channel != null) {
                connectionService.closeSftpChannel(channel);
            }
        }

        // 4. Mettre à jour les statuts finaux et journaliser
        if (success) {
            try {
                operationClient.updateOperationsStatus(opIds, "TRANSMITTED");
                log.info("Mise à jour statut TRANSMITTED réussie pour {} opération(s)", operations.size());
            } catch (Exception e) {
                log.error("Erreur critique: fichier transmis mais impossible de passer les opérations en statut TRANSMITTED pour {}",
                        config.getInstitutionCode(), e);
            }

            // Journaliser le succès
            SftpFileTransferDto logEntry = SftpFileTransferDto.builder()
                    .id(UUID.randomUUID())
                    .nomFichier(nomFichier)
                    .typeFichier(format)
                    .tailleBytes((long) fileContent.length)
                    .typeEvenement("DEPOSE")
                    .statut("SUCCES")
                    .institutionDestId(config.getInstitutionId())
                    .institutionDestCode(config.getInstitutionCode())
                    .cheminDestination(pathDest)
                    .timestamp(LocalDateTime.now())
                    .build();
            institutionClient.saveTransferLog(logEntry);

        } else {
            // Revenir en ACCEPTE_BANQUE_EMETTRICE pour pouvoir re-tenter la transmission
            try {
                operationClient.updateOperationsStatus(opIds, "ACCEPTE_BANQUE_EMETTRICE");
                log.info("Opérations remises en statut ACCEPTE_BANQUE_EMETTRICE suite à échec de transmission");
            } catch (Exception e) {
                log.error("Impossible de restaurer le statut ACCEPTE_BANQUE_EMETTRICE des opérations après échec de transmission chez {}",
                        config.getInstitutionCode(), e);
            }

            // Journaliser l'échec
            SftpFileTransferDto logEntry = SftpFileTransferDto.builder()
                    .id(UUID.randomUUID())
                    .nomFichier(nomFichier)
                    .typeFichier(format)
                    .tailleBytes((long) fileContent.length)
                    .typeEvenement("ERREUR")
                    .statut("ECHEC")
                    .institutionDestId(config.getInstitutionId())
                    .institutionDestCode(config.getInstitutionCode())
                    .messageErreur(errorMessage)
                    .timestamp(LocalDateTime.now())
                    .build();
            institutionClient.saveTransferLog(logEntry);
        }
    }

    private byte[] generateFileContent(List<OperationDto> operations, String format) {
        if ("XML".equalsIgnoreCase(format)) {
            StringBuilder xml = new StringBuilder();
            xml.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
            xml.append("<operations>\n");
            for (OperationDto op : operations) {
                xml.append("  <operation>\n");
                xml.append("    <reference>").append(escapeXml(op.getReferenceUnique())).append("</reference>\n");
                xml.append("    <type>").append(op.getTypeOperation()).append("</type>\n");
                xml.append("    <montant>").append(op.getMontant()).append("</montant>\n");
                xml.append("    <devise>").append(op.getDevise()).append("</devise>\n");
                xml.append("    <date>").append(op.getDateOperation()).append("</date>\n");
                xml.append("    <nomDonneurOrdre>").append(escapeXml(op.getNomDonneurOrdre())).append("</nomDonneurOrdre>\n");
                xml.append("    <compteDonneurOrdre>").append(escapeXml(op.getCompteDonneurOrdre())).append("</compteDonneurOrdre>\n");
                xml.append("    <nomBeneficiaire>").append(escapeXml(op.getNomBeneficiaire())).append("</nomBeneficiaire>\n");
                xml.append("    <compteBeneficiaire>").append(escapeXml(op.getCompteBeneficiaire())).append("</compteBeneficiaire>\n");
                xml.append("    <motif>").append(escapeXml(op.getMotif())).append("</motif>\n");
                xml.append("  </operation>\n");
            }
            xml.append("</operations>\n");
            return xml.toString().getBytes(StandardCharsets.UTF_8);

        } else if ("CSV".equalsIgnoreCase(format)) {
            StringBuilder csv = new StringBuilder();
            csv.append("ReferenceUnique,TypeOperation,Montant,Devise,DateOperation,CompteDonneurOrdre,NomDonneurOrdre,CompteBeneficiaire,NomBeneficiaire,Motif\n");
            for (OperationDto op : operations) {
                csv.append(String.format("\"%s\",\"%s\",%s,\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\"\n",
                        escapeCsv(op.getReferenceUnique()),
                        op.getTypeOperation(),
                        op.getMontant() != null ? op.getMontant().toPlainString() : "0.00",
                        op.getDevise(),
                        op.getDateOperation(),
                        escapeCsv(op.getCompteDonneurOrdre()),
                        escapeCsv(op.getNomDonneurOrdre()),
                        escapeCsv(op.getCompteBeneficiaire()),
                        escapeCsv(op.getNomBeneficiaire()),
                        escapeCsv(op.getMotif())
                ));
            }
            return csv.toString().getBytes(StandardCharsets.UTF_8);

        } else { // Fallback JSON
            StringBuilder json = new StringBuilder();
            json.append("[\n");
            for (int i = 0; i < operations.size(); i++) {
                OperationDto op = operations.get(i);
                json.append("  {\n");
                json.append("    \"referenceUnique\": \"").append(escapeJson(op.getReferenceUnique())).append("\",\n");
                json.append("    \"typeOperation\": \"").append(op.getTypeOperation()).append("\",\n");
                json.append("    \"montant\": ").append(op.getMontant()).append(",\n");
                json.append("    \"devise\": \"").append(op.getDevise()).append("\",\n");
                json.append("    \"dateOperation\": \"").append(op.getDateOperation()).append("\",\n");
                json.append("    \"compteDonneurOrdre\": \"").append(escapeJson(op.getCompteDonneurOrdre())).append("\",\n");
                json.append("    \"nomDonneurOrdre\": \"").append(escapeJson(op.getNomDonneurOrdre())).append("\",\n");
                json.append("    \"compteBeneficiaire\": \"").append(escapeJson(op.getCompteBeneficiaire())).append("\",\n");
                json.append("    \"nomBeneficiaire\": \"").append(escapeJson(op.getNomBeneficiaire())).append("\",\n");
                json.append("    \"motif\": \"").append(escapeJson(op.getMotif())).append("\"\n");
                json.append("  }");
                if (i < operations.size() - 1) {
                    json.append(",");
                }
                json.append("\n");
            }
            json.append("]");
            return json.toString().getBytes(StandardCharsets.UTF_8);
        }
    }

    private String escapeXml(String val) {
        if (val == null) return "";
        return val.replace("&", "&amp;")
                  .replace("<", "&lt;")
                  .replace(">", "&gt;")
                  .replace("\"", "&quot;")
                  .replace("'", "&apos;");
    }

    private String escapeCsv(String val) {
        if (val == null) return "";
        return val.replace("\"", "\"\"");
    }

    private String escapeJson(String val) {
        if (val == null) return "";
        return val.replace("\\", "\\\\")
                  .replace("\"", "\\\"");
    }
}
