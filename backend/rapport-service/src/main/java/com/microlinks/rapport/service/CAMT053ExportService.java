package com.microlinks.rapport.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Service d'export au format CAMT.053 (ISO 20022 - Bank-to-Customer Statement).
 */
@Service
@Slf4j
public class CAMT053ExportService {

    public byte[] exportCAMT053(List<Map<String, Object>> operations,
                                  String compteCorrespondance, String institutionBic,
                                  String institutionNom, LocalDate dateDebut, LocalDate dateFin) {
        String msgId = "ML" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        String creationDate = LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);

        BigDecimal totalCredit = operations.stream()
            .map(op -> {
                Object v = op.get("montant");
                return v instanceof Number n ? BigDecimal.valueOf(n.doubleValue()) : BigDecimal.ZERO;
            })
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        String devise = operations.isEmpty() ? "XOF" : str(operations.getFirst(), "devise");

        StringBuilder xml = new StringBuilder();
        xml.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        xml.append("<Document xmlns=\"urn:iso:std:iso:20022:tech:xsd:camt.053.001.08\">\n");
        xml.append("  <BkToCstmrStmt>\n");
        xml.append("    <GrpHdr>\n");
        xml.append("      <MsgId>").append(msgId).append("</MsgId>\n");
        xml.append("      <CreDtTm>").append(creationDate).append("</CreDtTm>\n");
        xml.append("      <MsgRcpt>\n");
        xml.append("        <Nm>").append(escapeXml(institutionNom)).append("</Nm>\n");
        xml.append("      </MsgRcpt>\n");
        xml.append("    </GrpHdr>\n");

        xml.append("    <Stmt>\n");
        xml.append("      <Id>").append(UUID.randomUUID()).append("</Id>\n");
        xml.append("      <CreDtTm>").append(creationDate).append("</CreDtTm>\n");
        xml.append("      <FrToDt>\n");
        xml.append("        <FrDtTm>").append(dateDebut).append("T00:00:00</FrDtTm>\n");
        xml.append("        <ToDtTm>").append(dateFin).append("T23:59:59</ToDtTm>\n");
        xml.append("      </FrToDt>\n");

        // Compte
        xml.append("      <Acct>\n");
        xml.append("        <Id><Othr><Id>").append(compteCorrespondance).append("</Id></Othr></Id>\n");
        xml.append("        <Ccy>").append(devise).append("</Ccy>\n");
        xml.append("        <Svcr><FinInstnId><BICFI>").append(institutionBic).append("</BICFI></FinInstnId></Svcr>\n");
        xml.append("      </Acct>\n");

        // Solde initial
        xml.append("      <Bal>\n");
        xml.append("        <Tp><CdOrPrtry><Cd>OPBD</Cd></CdOrPrtry></Tp>\n");
        xml.append("        <Amt Ccy=\"").append(devise).append("\">0.00</Amt>\n");
        xml.append("        <CdtDbtInd>CRDT</CdtDbtInd>\n");
        xml.append("        <Dt><Dt>").append(dateDebut).append("</Dt></Dt>\n");
        xml.append("      </Bal>\n");

        // Solde final
        xml.append("      <Bal>\n");
        xml.append("        <Tp><CdOrPrtry><Cd>CLBD</Cd></CdOrPrtry></Tp>\n");
        xml.append("        <Amt Ccy=\"").append(devise).append("\">").append(totalCredit.toPlainString()).append("</Amt>\n");
        xml.append("        <CdtDbtInd>CRDT</CdtDbtInd>\n");
        xml.append("        <Dt><Dt>").append(dateFin).append("</Dt></Dt>\n");
        xml.append("      </Bal>\n");

        // Résumé
        xml.append("      <TxsSummry>\n");
        xml.append("        <TtlNtries><NbOfNtries>").append(operations.size()).append("</NbOfNtries>");
        xml.append("<Sum>").append(totalCredit.toPlainString()).append("</Sum></TtlNtries>\n");
        xml.append("      </TxsSummry>\n");

        // Transactions
        for (Map<String, Object> op : operations) {
            String reference = str(op, "referenceUnique");
            String dateOp = str(op, "dateOperation");
            BigDecimal montant = getMontant(op);
            String deviseOp = str(op, "devise");
            String typeOp = str(op, "typeOperation");
            String motif = str(op, "motif");

            String cdtDbt = "CRDT";  // Crédit par défaut
            String domainCode = switch (typeOp) {
                case "VIREMENT" -> "PMNT";
                case "CHEQUE" -> "PMNT";
                case "PRELEVEMENT" -> "PMNT";
                default -> "PMNT";
            };

            xml.append("      <Ntry>\n");
            xml.append("        <Amt Ccy=\"").append(deviseOp).append("\">").append(montant.toPlainString()).append("</Amt>\n");
            xml.append("        <CdtDbtInd>").append(cdtDbt).append("</CdtDbtInd>\n");
            xml.append("        <Sts><Cd>BOOK</Cd></Sts>\n");
            xml.append("        <BookgDt><Dt>").append(dateOp).append("</Dt></BookgDt>\n");
            xml.append("        <ValDt><Dt>").append(dateOp).append("</Dt></ValDt>\n");
            xml.append("        <NtryDtls>\n");
            xml.append("          <TxDtls>\n");
            xml.append("            <Refs><EndToEndId>").append(reference).append("</EndToEndId></Refs>\n");
            xml.append("            <RmtInf><Ustrd>").append(escapeXml(motif)).append("</Ustrd></RmtInf>\n");
            xml.append("            <RltdPties>\n");
            xml.append("              <Dbtr><Pty><Nm>").append(escapeXml(str(op, "nomDonneurOrdre"))).append("</Nm></Pty></Dbtr>\n");
            xml.append("              <Cdtr><Pty><Nm>").append(escapeXml(str(op, "nomBeneficiaire"))).append("</Nm></Pty></Cdtr>\n");
            xml.append("            </RltdPties>\n");
            xml.append("          </TxDtls>\n");
            xml.append("        </NtryDtls>\n");
            xml.append("      </Ntry>\n");
        }

        xml.append("    </Stmt>\n");
        xml.append("  </BkToCstmrStmt>\n");
        xml.append("</Document>\n");

        log.info("Export CAMT.053 généré : {} opérations", operations.size());
        return xml.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    private String str(Map<String, Object> m, String k) {
        Object v = m.get(k);
        return v != null ? v.toString() : "";
    }

    private BigDecimal getMontant(Map<String, Object> op) {
        Object v = op.get("montant");
        if (v instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        return BigDecimal.ZERO;
    }

    private String escapeXml(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("\"", "&quot;").replace("'", "&apos;");
    }
}
