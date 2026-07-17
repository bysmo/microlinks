package com.microlinks.rapport.service;

import org.junit.jupiter.api.Test;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

public class ExcelExportServiceTest {

    private final ExcelExportService excelExportService = new ExcelExportService();

    @Test
    public void testExportOperationsExcel_Success() throws Exception {
        Map<String, Object> op = new HashMap<>();
        op.put("referenceUnique", "ML-VIR-001");
        op.put("dateOperation", "16/06/2026");
        op.put("typeOperation", "VIREMENT");
        op.put("statut", "COMPTABILISE");
        op.put("nomDonneurOrdre", "Jean Dupont");
        op.put("nomInstitutionEmettrice", "SFD Emetteur");
        op.put("nomBeneficiaire", "Marie Konan");
        op.put("nomInstitutionBeneficiaire", "SFD Beneficiaire");
        op.put("motif", "Frais scolarite");
        op.put("montant", 150000.0);
        op.put("devise", "XOF");

        byte[] result = excelExportService.exportOperationsExcel(
                List.of(op),
                "SFD Emetteur",
                LocalDate.of(2026, 6, 1),
                LocalDate.of(2026, 6, 16)
        );

        assertThat(result).isNotNull();
        assertThat(result.length).isGreaterThan(0);
    }
}
