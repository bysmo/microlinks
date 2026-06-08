package com.microlinks.rapport.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

/**
 * Service d'export au format MT940 (SWIFT standard pour relevés de compte).
 */
@Service
@Slf4j
public class MT940ExportService {

    private static final DateTimeFormatter MT940_DATE = DateTimeFormatter.ofPattern("yyMMdd");
    private static final DateTimeFormatter MT940_DATE_LONG = DateTimeFormatter.ofPattern("yyMMddMMdd");

    public byte[] exportMT940(List<Map<String, Object>> operations,
                               String compteCorrespondance, String institutionBic,
                               LocalDate dateDebut, LocalDate dateFin) {
        StringBuilder sb = new StringBuilder();

        // Tag :20: Transaction Reference Number
        sb.append(":20:MICROLINKS").append(dateDebut.format(DateTimeFormatter.ofPattern("yyyyMMdd"))).append("\n");

        // Tag :25: Account Identification
        sb.append(":25:").append(institutionBic).append("/").append(compteCorrespondance).append("\n");

        // Tag :28C: Statement Number
        sb.append(":28C:").append(String.format("%05d", 1)).append("/001").append("\n");

        // Tag :60F: Opening Balance
        BigDecimal totalDebit = BigDecimal.ZERO;
        BigDecimal totalCredit = BigDecimal.ZERO;

        for (Map<String, Object> op : operations) {
            Object montantObj = op.get("montant");
            BigDecimal montant = montantObj instanceof Number n
                    ? BigDecimal.valueOf(n.doubleValue())
                    : BigDecimal.ZERO;
            totalCredit = totalCredit.add(montant);
        }

        sb.append(":60F:C").append(dateDebut.format(MT940_DATE))
          .append(getDevise(operations))
          .append(formatMontant(BigDecimal.ZERO)).append("\n");

        // Tags :61: et :86: pour chaque opération
        for (Map<String, Object> op : operations) {
            BigDecimal montant = getMontant(op);
            String devise = str(op, "devise");
            String date = formatDate(str(op, "dateOperation"));
            String reference = str(op, "referenceUnique");
            String type = str(op, "typeOperation");
            String beneficiaire = str(op, "nomBeneficiaire");
            String motif = str(op, "motif");

            // Tag :61: Statement Line
            String transactionCode = switch (type) {
                case "VIREMENT" -> "TRF";
                case "CHEQUE" -> "CHG";
                case "PRELEVEMENT" -> "DDT";
                default -> "MSC";
            };

            sb.append(":61:").append(date).append(date, 2, 6)
              .append("C")  // C=Credit
              .append(formatMontant(montant))
              .append(transactionCode).append(reference).append("\n");

            // Tag :86: Information to Account Owner
            sb.append(":86:").append("/DON/").append(str(op, "nomDonneurOrdre"))
              .append("/BEN/").append(beneficiaire)
              .append("/REF/").append(reference)
              .append("/MOT/").append(truncate(motif, 100)).append("\n");
        }

        // Tag :62F: Closing Balance
        sb.append(":62F:C").append(dateFin.format(MT940_DATE))
          .append(getDevise(operations))
          .append(formatMontant(totalCredit)).append("\n");

        // Séparateur fin de message
        sb.append("-").append("\n");

        log.info("Export MT940 généré : {} opérations", operations.size());
        return sb.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    private String formatMontant(BigDecimal montant) {
        return montant.toPlainString().replace(".", ",");
    }

    private String formatDate(String dateStr) {
        if (dateStr == null || dateStr.isEmpty()) return "";
        try {
            LocalDate d = LocalDate.parse(dateStr);
            return d.format(MT940_DATE);
        } catch (Exception e) {
            return dateStr.replace("-", "").substring(2, 8);
        }
    }

    private BigDecimal getMontant(Map<String, Object> op) {
        Object v = op.get("montant");
        if (v instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        return BigDecimal.ZERO;
    }

    private String getDevise(List<Map<String, Object>> ops) {
        if (!ops.isEmpty()) {
            Object d = ops.getFirst().get("devise");
            if (d != null) return d.toString();
        }
        return "XOF";
    }

    private String str(Map<String, Object> m, String k) {
        Object v = m.get(k);
        return v != null ? v.toString() : "";
    }

    private String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() > max ? s.substring(0, max) : s;
    }
}
