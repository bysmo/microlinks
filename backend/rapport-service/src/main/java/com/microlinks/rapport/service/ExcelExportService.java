package com.microlinks.rapport.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.*;
import org.springframework.stereotype.Service;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExcelExportService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    public byte[] exportOperationsExcel(List<Map<String, Object>> operations,
                                         String institutionNom, LocalDate dateDebut, LocalDate dateFin)
            throws Exception {

        try (XSSFWorkbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            XSSFSheet sheet = workbook.createSheet("Opérations MicroLinks");

            // ===== Styles =====
            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle titleStyle = createTitleStyle(workbook);
            CellStyle dataStyle = createDataStyle(workbook);
            CellStyle amountStyle = createAmountStyle(workbook);
            CellStyle dateStyle = createDateCellStyle(workbook);

            int rowNum = 0;

            // ===== En-tête du document =====
            Row titleRow = sheet.createRow(rowNum++);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("MICROLINKS - Relevé des Opérations");
            titleCell.setCellStyle(titleStyle);
            sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, 9));

            Row subTitleRow = sheet.createRow(rowNum++);
            subTitleRow.createCell(0).setCellValue("Institution : " + institutionNom);
            subTitleRow.createCell(5).setCellValue(
                "Période : " + dateDebut.format(DATE_FMT) + " au " + dateFin.format(DATE_FMT));

            Row generatedRow = sheet.createRow(rowNum++);
            generatedRow.createCell(0).setCellValue(
                "Généré le : " + LocalDate.now().format(DATE_FMT));

            rowNum++; // ligne vide

            // ===== En-tête des colonnes =====
            String[] headers = {
                "Référence", "Date", "Type", "Statut", "Donneur d'ordre",
                "Institution émettrice", "Bénéficiaire", "Institution bénéficiaire",
                "Motif", "Montant", "Devise"
            };
            Row headerRow = sheet.createRow(rowNum++);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // ===== Données =====
            BigDecimal totalMontant = BigDecimal.ZERO;
            for (Map<String, Object> op : operations) {
                Row dataRow = sheet.createRow(rowNum++);
                dataRow.createCell(0).setCellValue(str(op, "referenceUnique"));
                dataRow.createCell(1).setCellValue(str(op, "dateOperation"));
                dataRow.createCell(2).setCellValue(str(op, "typeOperation"));
                dataRow.createCell(3).setCellValue(str(op, "statut"));
                dataRow.createCell(4).setCellValue(str(op, "nomDonneurOrdre"));
                dataRow.createCell(5).setCellValue(str(op, "nomInstitutionEmettrice"));
                dataRow.createCell(6).setCellValue(str(op, "nomBeneficiaire"));
                dataRow.createCell(7).setCellValue(str(op, "nomInstitutionBeneficiaire"));
                dataRow.createCell(8).setCellValue(str(op, "motif"));

                Object montantObj = op.get("montant");
                if (montantObj instanceof Number n) {
                    Cell montantCell = dataRow.createCell(9);
                    montantCell.setCellValue(n.doubleValue());
                    montantCell.setCellStyle(amountStyle);
                    totalMontant = totalMontant.add(BigDecimal.valueOf(n.doubleValue()));
                }
                dataRow.createCell(10).setCellValue(str(op, "devise"));

                // Appliquer styles alternés
                for (int c = 0; c < 11; c++) {
                    if (dataRow.getCell(c) != null && c != 9) {
                        dataRow.getCell(c).setCellStyle(dataStyle);
                    }
                }
            }

            // ===== Total =====
            rowNum++;
            Row totalRow = sheet.createRow(rowNum);
            Cell totalLabelCell = totalRow.createCell(8);
            totalLabelCell.setCellValue("TOTAL");
            totalLabelCell.setCellStyle(headerStyle);
            Cell totalCell = totalRow.createCell(9);
            totalCell.setCellValue(totalMontant.doubleValue());
            totalCell.setCellStyle(amountStyle);

            // ===== Auto-size colonnes =====
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            log.info("Export Excel généré : {} opérations", operations.size());
            return out.toByteArray();
        }
    }

    // ===== Helpers styles =====

    private CellStyle createTitleStyle(XSSFWorkbook wb) {
        CellStyle style = wb.createCellStyle();
        XSSFFont font = wb.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 16);
        font.setColor(IndexedColors.DARK_BLUE.getIndex());
        style.setFont(font);
        return style;
    }

    private CellStyle createHeaderStyle(XSSFWorkbook wb) {
        CellStyle style = wb.createCellStyle();
        XSSFFont font = wb.createFont();
        font.setBold(true);
        font.setColor(IndexedColors.WHITE.getIndex());
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setBorderBottom(BorderStyle.THIN);
        style.setAlignment(HorizontalAlignment.CENTER);
        return style;
    }

    private CellStyle createDataStyle(XSSFWorkbook wb) {
        CellStyle style = wb.createCellStyle();
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        return style;
    }

    private CellStyle createAmountStyle(XSSFWorkbook wb) {
        CellStyle style = wb.createCellStyle();
        DataFormat format = wb.createDataFormat();
        style.setDataFormat(format.getFormat("#,##0.00"));
        style.setAlignment(HorizontalAlignment.RIGHT);
        style.setBorderBottom(BorderStyle.THIN);
        return style;
    }

    private CellStyle createDateCellStyle(XSSFWorkbook wb) {
        CellStyle style = wb.createCellStyle();
        DataFormat format = wb.createDataFormat();
        style.setDataFormat(format.getFormat("dd/mm/yyyy"));
        return style;
    }

    private String str(Map<String, Object> map, String key) {
        Object v = map.get(key);
        return v != null ? v.toString() : "";
    }
}
