package com.microlinks.rapport.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;

/**
 * Service pour la génération de messages MT101 (SWIFT) et pain.001 (ISO 20022 XML)
 * pour des opérations individuelles validées.
 */
@Service
@Slf4j
public class MT101Pain001ExportService {

    private static final DateTimeFormatter SWIFT_DATE = DateTimeFormatter.ofPattern("yyMMdd");

    /**
     * Génère un fichier MT101 pour une opération.
     */
    public byte[] generateMT101(Map<String, Object> op, String emetteurBic, String recepteurBic) {
        StringBuilder sb = new StringBuilder();

        String ref = str(op, "referenceUnique");
        String dateOp = formatDateSwift(str(op, "dateOperation"));
        BigDecimal montant = getMontant(op);
        String devise = str(op, "devise");
        String motif = truncate(str(op, "motif"), 140);

        String senderBic = cleanBic(emetteurBic, "MLINKEMXXXX");
        String receiverBic = cleanBic(recepteurBic, "MLINKREXXXX");

        // En-têtes de bloc SWIFT standards (optionnel mais très représentatif d'un vrai MT101)
        sb.append("{1:F01").append(senderBic).append("AXXX0000000000}")
          .append("{2:I101").append(receiverBic).append("N}")
          .append("{4:\n");

        // Tag :20: Sender's Reference
        sb.append(":20:").append(ref).append("\n");

        // Tag :28D: Message Index
        sb.append(":28D:1/1\n");

        // Tag :50H: /Account (Ordering Customer Account)
        sb.append(":50H:/").append(str(op, "compteDonneurOrdre")).append("\n")
          .append(truncate(str(op, "nomDonneurOrdre"), 35)).append("\n");

        // Tag :52A: Ordering Institution
        sb.append(":52A:").append(senderBic).append("\n");

        // Tag :32B: Currency/Transaction Amount
        sb.append(":32B:").append(devise).append(formatMontantSwift(montant)).append("\n");

        // Tag :57A: Account Servicing Institution (Receiving Bank)
        sb.append(":57A:").append(receiverBic).append("\n");

        // Tag :59: Beneficiary Customer
        sb.append(":59:/").append(str(op, "compteBeneficiaire")).append("\n")
          .append(truncate(str(op, "nomBeneficiaire"), 35)).append("\n");

        // Tag :70: Remittance Information (Motif)
        if (!motif.isEmpty()) {
            sb.append(":70:").append(motif).append("\n");
        }

        // Fin de bloc SWIFT
        sb.append("-}");

        log.info("Fichier MT101 généré pour l'opération : {}", ref);
        return sb.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    /**
     * Génère un fichier pain.001 (ISO 20022 XML) pour une opération.
     */
    public byte[] generatePain001(Map<String, Object> op, String emetteurBic, String recepteurBic) {
        String ref = str(op, "referenceUnique");
        String creationDt = LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        BigDecimal montant = getMontant(op);
        String devise = str(op, "devise");
        String dateExec = str(op, "dateOperation");
        String motif = str(op, "motif");

        String senderBic = cleanBic(emetteurBic, "MLINKEMXXXX");
        String receiverBic = cleanBic(recepteurBic, "MLINKREXXXX");

        StringBuilder xml = new StringBuilder();
        xml.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        xml.append("<Document xmlns=\"urn:iso:std:iso:20022:tech:xsd:pain.001.001.03\">\n");
        xml.append("  <CstmrCdtTrfInitn>\n");

        // Group Header (GrpHdr)
        xml.append("    <GrpHdr>\n");
        xml.append("      <MsgId>").append(escapeXml(ref)).append("</MsgId>\n");
        xml.append("      <CreDtTm>").append(creationDt).append("</CreDtTm>\n");
        xml.append("      <NbOfTxs>1</NbOfTxs>\n");
        xml.append("      <CtrlSum>").append(montant.toPlainString()).append("</CtrlSum>\n");
        xml.append("      <InitgPty>\n");
        xml.append("        <Nm>").append(escapeXml(str(op, "nomDonneurOrdre"))).append("</Nm>\n");
        xml.append("      </InitgPty>\n");
        xml.append("    </GrpHdr>\n");

        // Payment Information (PmtInf)
        xml.append("    <PmtInf>\n");
        xml.append("      <PmtInfId>PMT-").append(escapeXml(ref)).append("</PmtInfId>\n");
        xml.append("      <PmtMtd>TRF</PmtMtd>\n");
        xml.append("      <NbOfTxs>1</NbOfTxs>\n");
        xml.append("      <CtrlSum>").append(montant.toPlainString()).append("</CtrlSum>\n");
        xml.append("      <ReqdExctnDt>").append(dateExec).append("</ReqdExctnDt>\n");
        xml.append("      <Dbtr>\n");
        xml.append("        <Nm>").append(escapeXml(str(op, "nomDonneurOrdre"))).append("</Nm>\n");
        xml.append("      </Dbtr>\n");
        xml.append("      <DbtrAcct>\n");
        xml.append("        <Id>\n");
        xml.append("          <Othr>\n");
        xml.append("            <Id>").append(escapeXml(str(op, "compteDonneurOrdre"))).append("</Id>\n");
        xml.append("          </Othr>\n");
        xml.append("        </Id>\n");
        xml.append("        <Ccy>").append(devise).append("</Ccy>\n");
        xml.append("      </DbtrAcct>\n");
        xml.append("      <DbtrAgt>\n");
        xml.append("        <FinInstnId>\n");
        xml.append("          <BIC>").append(senderBic).append("</BIC>\n");
        xml.append("          <Nm>").append(escapeXml(str(op, "nomInstitutionEmettrice"))).append("</Nm>\n");
        xml.append("        </FinInstnId>\n");
        xml.append("      </DbtrAgt>\n");

        // Credit Transfer Transaction Information (CdtTrfTxInf)
        xml.append("      <CdtTrfTxInf>\n");
        xml.append("        <PmtId>\n");
        xml.append("          <EndToEndId>").append(escapeXml(ref)).append("</EndToEndId>\n");
        xml.append("        </PmtId>\n");
        xml.append("        <Amt>\n");
        xml.append("          <InstdAmt Ccy=\"").append(devise).append("\">").append(montant.toPlainString()).append("</InstdAmt>\n");
        xml.append("        </Amt>\n");
        xml.append("        <CdtrAgt>\n");
        xml.append("          <FinInstnId>\n");
        xml.append("            <BIC>").append(receiverBic).append("</BIC>\n");
        xml.append("            <Nm>").append(escapeXml(str(op, "nomInstitutionBeneficiaire"))).append("</Nm>\n");
        xml.append("          </FinInstnId>\n");
        xml.append("        </CdtrAgt>\n");
        xml.append("        <Cdtr>\n");
        xml.append("          <Nm>").append(escapeXml(str(op, "nomBeneficiaire"))).append("</Nm>\n");
        xml.append("        </Cdtr>\n");
        xml.append("        <CdtrAcct>\n");
        xml.append("          <Id>\n");
        xml.append("            <Othr>\n");
        xml.append("              <Id>").append(escapeXml(str(op, "compteBeneficiaire"))).append("</Id>\n");
        xml.append("            </Othr>\n");
        xml.append("          </Id>\n");
        xml.append("        </CdtrAcct>\n");
        if (!motif.isEmpty()) {
            xml.append("        <RmtInf>\n");
            xml.append("          <Ustrd>").append(escapeXml(motif)).append("</Ustrd>\n");
            xml.append("        </RmtInf>\n");
        }
        xml.append("      </CdtTrfTxInf>\n");

        xml.append("    </PmtInf>\n");
        xml.append("  </CstmrCdtTrfInitn>\n");
        xml.append("</Document>\n");

        log.info("Fichier pain.001 XML généré pour l'opération : {}", ref);
        return xml.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    // ===== Helpers =====

    private String cleanBic(String bic, String fallback) {
        if (bic == null || bic.trim().isEmpty()) {
            return fallback;
        }
        String cleaned = bic.trim().replaceAll("\\s+", "");
        if (cleaned.length() < 8) {
            return (cleaned + "XXXXXXXX").substring(0, 11);
        }
        return cleaned;
    }

    private String formatDateSwift(String dateStr) {
        if (dateStr == null || dateStr.isEmpty()) return "";
        try {
            LocalDate d = LocalDate.parse(dateStr);
            return d.format(SWIFT_DATE);
        } catch (Exception e) {
            return dateStr.replace("-", "").substring(2, 8);
        }
    }

    private String formatMontantSwift(BigDecimal montant) {
        return montant.toPlainString().replace(".", ",");
    }

    private BigDecimal getMontant(Map<String, Object> op) {
        Object v = op.get("montant");
        if (v instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        return BigDecimal.ZERO;
    }

    private String str(Map<String, Object> m, String k) {
        Object v = m.get(k);
        return v != null ? v.toString() : "";
    }

    private String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() > max ? s.substring(0, max) : s;
    }

    private String escapeXml(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("\"", "&quot;").replace("'", "&apos;");
    }
}
