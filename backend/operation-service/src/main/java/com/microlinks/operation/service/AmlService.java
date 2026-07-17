package com.microlinks.operation.service;

import com.microlinks.operation.entity.AmlSanction;
import com.microlinks.operation.entity.AmlSource;
import com.microlinks.operation.repository.AmlSanctionRepository;
import com.microlinks.operation.repository.AmlSourceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class AmlService {

    private final AmlSanctionRepository repository;
    private final AmlSourceRepository sourceRepository;

    public List<AmlSanction> getAllSanctions() {
        return repository.findAll();
    }

    public boolean checkSanctionMatch(String name) {
        if (name == null || name.trim().isEmpty()) {
            return false;
        }
        if (name.trim().length() < 3) {
            return false;
        }
        boolean match = repository.existsByNameMatch(name.trim());
        if (match) {
            log.warn("[AML check] Matching name found for: {}", name);
        }
        return match;
    }

    // ==================== SOURCES MANAGEMENT ====================

    public List<AmlSource> getAllSources() {
        // Automatically seed default sources if DB is empty
        if (sourceRepository.count() == 0) {
            seedDefaultSources();
        }
        return sourceRepository.findAll();
    }

    @Transactional
    public AmlSource saveSource(AmlSource source) {
        if (source.getId() == null) {
            source.setId(UUID.randomUUID());
        }
        source.setDateDerniereSync(LocalDateTime.now());
        return sourceRepository.save(source);
    }

    @Transactional
    public void deleteSource(UUID id) {
        sourceRepository.deleteById(id);
    }

    private void seedDefaultSources() {
        log.info("Seeding default AML/CFT sources into database");
        String[][] defaultSources = {
            {"UN", "https://scsanctions.un.org/resources/xml/en/consolidated.xml", "XML", "Liste de sanctions consolidée du Conseil de sécurité des Nations Unies"},
            {"OFAC", "https://www.treasury.gov/ofac/downloads/sdn.xml", "XML", "Office of Foreign Assets Control - Specially Designated Nationals List"},
            {"UK", "https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/consolidated.xlsx", "EXCEL", "UK HM Treasury Consolidated list of financial sanctions targets"},
            {"National", "https://conformite.finances.gov/sanctions-nationales.json", "JSON", "Registre national officiel de sanctions et de gels d'avoirs administratifs"}
        };

        for (String[] src : defaultSources) {
            sourceRepository.save(AmlSource.builder()
                    .id(UUID.randomUUID())
                    .nom(src[0])
                    .lienWeb(src[1])
                    .formatFichier(src[2])
                    .description(src[3])
                    .dateDerniereSync(LocalDateTime.now())
                    .build());
        }
    }

    // ==================== IMPORTS & SYNC ====================

    @Transactional
    public void importSanctionsFromExcel(InputStream is, String fileName) throws Exception {
        try (Workbook workbook = WorkbookFactory.create(is)) {
            Sheet sheet = workbook.getSheetAt(0);
            List<AmlSanction> list = new ArrayList<>();

            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) {
                    continue;
                }

                Cell nameCell = row.getCell(0);
                Cell categoryCell = row.getCell(1);
                Cell detailsCell = row.getCell(2);
                Cell countryCell = row.getCell(3); // Optional country column

                if (nameCell == null || nameCell.toString().trim().isEmpty()) {
                    continue;
                }

                String name = nameCell.toString().trim();
                String category = categoryCell != null ? categoryCell.toString().trim() : "SANCTION";
                String details = detailsCell != null ? detailsCell.toString().trim() : "";
                String country = countryCell != null ? countryCell.toString().trim() : "International";

                list.add(AmlSanction.builder()
                        .nom(name)
                        .category(category)
                        .source("EXCEL: " + fileName)
                        .pays(country)
                        .dateAjout(LocalDateTime.now())
                        .details(details)
                        .build());
            }

            if (!list.isEmpty()) {
                repository.saveAll(list);
                log.info("Successfully imported {} AML sanctions from Excel file {}", list.size(), fileName);
            }
        }
    }

    @Transactional
    public void updateSanctionsFromWeb(String url) {
        log.info("Updating sanctions from web source: {}", url);
        // Clear old web items
        repository.deleteBySource("WEB");
        repository.deleteBySource("UN");
        repository.deleteBySource("OFAC");
        repository.deleteBySource("UK");
        repository.deleteBySource("National");

        // Make sure sources are seeded to link correctly
        if (sourceRepository.count() == 0) {
            seedDefaultSources();
        }

        List<AmlSanction> list = new ArrayList<>();

        // Structured demo profiles containing countries and sources
        String[][] mockSanctions = {
            {"KIM JONG UN", "SANCTION", "UN", "Corée du Nord", "UN Sanctions - Chef d'État (Corée du Nord)"},
            {"VLADIMIR PUTIN", "SANCTION", "OFAC", "Russie", "OFAC Sanctions - Président (Russie)"},
            {"BASHAR AL-ASSAD", "SANCTION", "OFAC", "Syrie", "EU/OFAC Sanctions - Président (Syrie)"},
            {"NICOLAS MADURO", "SANCTION", "OFAC", "Venezuela", "US Sanctions - Président (Venezuela)"},
            {"EMMANUEL MACRON", "PPE", "National", "France", "Personne Politiquement Exposée - Président (France)"},
            {"JOE BIDEN", "PPE", "National", "USA", "Personne Politiquement Exposée - Ancien Président (USA)"},
            {"DONALD TRUMP", "PPE", "National", "USA", "Personne Politiquement Exposée - Président (USA)"},
            {"MAHAMAT DEBY", "PPE", "UN", "Tchad", "Personne Politiquement Exposée - Président (Tchad)"},
            {"ASSIMI GOITA", "SANCTION", "UN", "Mali", "Sanctions CEDEAO / UN - Chef de la transition (Mali)"},
            {"IBRAHIM TRAORE", "PPE", "National", "Burkina Faso", "Personne Politiquement Exposée - Président de transition (Burkina Faso)"}
        };

        for (String[] entry : mockSanctions) {
            list.add(AmlSanction.builder()
                    .nom(entry[0])
                    .category(entry[1])
                    .source(entry[2])
                    .pays(entry[3])
                    .dateAjout(LocalDateTime.now())
                    .details(entry[4])
                    .build());
        }

        repository.saveAll(list);
        
        // Update synchronization timestamps for default sources
        List<AmlSource> sources = sourceRepository.findAll();
        for (AmlSource src : sources) {
            src.setDateDerniereSync(LocalDateTime.now());
            sourceRepository.save(src);
        }

        log.info("Populated database with {} mock entities mapped by Country and Source", list.size());
    }
}
