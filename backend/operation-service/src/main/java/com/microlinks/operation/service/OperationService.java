package com.microlinks.operation.service;

import com.microlinks.operation.dto.*;
import com.microlinks.operation.entity.*;
import com.microlinks.operation.exception.*;
import com.microlinks.operation.repository.OperationRepository;
import com.microlinks.operation.repository.HistoriqueStatutRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class OperationService {

    private final OperationRepository operationRepository;
    private final HistoriqueStatutRepository historiqueRepository;
    private final OperationWorkflowMachine workflowMachine;
    private final RabbitTemplate rabbitTemplate;
    private final AmlService amlService;

    @Value("${microlinks.rabbitmq.exchange}")
    private String exchange;

    private static final AtomicLong sequence = new AtomicLong(0);

    // ===================== CRUD =====================

    public PagedResponse<OperationDto> findAll(OperationSearchRequest req, int page, int size) {
        Sort sort = Sort.by("createdAt").descending();
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<Operation> ops = operationRepository.findWithFilters(
                req.getSearch(), req.getTypeOperation(), req.getStatut(),
                req.getInstitutionEmettriceId(), req.getInstitutionBeneficiaireId(),
                req.getInstitutionId(),
                req.getBanqueCorrespondanteEmettriceId(), req.getBanqueCorrespondanteReceptriceId(),
                req.getDateDebut(), req.getDateFin(), req.getDevise(),
                req.getExcludeTerminal(), req.getOnlyTerminal(),
                pageable
        );

        return PagedResponse.of(ops.getContent().stream().map(this::toDto).toList(),
                page, size, ops.getTotalElements());
    }

    public OperationDto findById(UUID id) {
        return toDto(getOperationById(id));
    }

    public OperationDto findByReference(String reference) {
        return operationRepository.findByReferenceUnique(reference)
                .map(this::toDto)
                .orElseThrow(() -> new ResourceNotFoundException("Opération " + reference + " non trouvée"));
    }

    @Transactional
    public OperationDto create(OperationCreateRequest req, String userId, String userName, UUID institutionId) {
        UUID opId = UUID.randomUUID();
        UUID activeTenantId = com.microlinks.operation.config.TenantContext.getCurrentTenant();
        if (activeTenantId == null) {
            activeTenantId = institutionId;
        }

        // Recherche du hash de la transaction précédente
        String prevHash = operationRepository.findFirstByOrderByCreatedAtDesc()
                .map(Operation::getHash)
                .orElse("0000000000000000000000000000000000000000000000000000000000000000");

        LocalDateTime now = LocalDateTime.now();

        PostalAddressDto addrDO   = req.getAdresseDonneurOrdre();
        PostalAddressDto addrDOE  = req.getAdresseDonneurOrdreEffectif();
        PostalAddressDto addrBEN  = req.getAdresseBeneficiaire();
        PostalAddressDto addrBENE = req.getAdresseBeneficiaireEffectif();

        Operation op = Operation.builder()
                .id(opId)
                .tenantId(activeTenantId)
                .referenceUnique(generateReference(req.getTypeOperation()))
                .typeOperation(req.getTypeOperation())
                .statut(StatutOperation.BROUILLON)
                .dateOperation(req.getDateOperation() != null ? req.getDateOperation() : LocalDate.now())
                .dateValeur(req.getDateValeur())
                .montant(req.getMontant())
                .devise(req.getDevise())
                .motif(req.getMotif())
                // Emetteur
                .institutionEmettriceId(req.getInstitutionEmettriceId())
                .nomInstitutionEmettrice(req.getNomInstitutionEmettrice())
                .compteDonneurOrdre(req.getCompteDonneurOrdre())
                .nomDonneurOrdre(req.getNomDonneurOrdre())
                .banqueCorrespondanteEmettriceId(req.getBanqueCorrespondanteEmettriceId())
                .nomBanqueCorrespondanteEmettrice(req.getNomBanqueCorrespondanteEmettrice())
                .compteCorrespondanceEmetteur(req.getCompteCorrespondanceEmetteur())
                // Adresse DO (ISO 20022)
                .adresseDonRue(addrDO != null ? addrDO.getRue() : null)
                .adresseDonComplement(addrDO != null ? addrDO.getComplement() : null)
                .adresseDonVille(addrDO != null ? addrDO.getVille() : null)
                .adresseDonCodePostal(addrDO != null ? addrDO.getCodePostal() : null)
                .adresseDonPays(addrDO != null ? addrDO.getPays() : null)
                // DO Effectif (Ultimate Debtor)
                .nomDonneurOrdreEffectif(req.getNomDonneurOrdreEffectif())
                .adressDoeRue(addrDOE != null ? addrDOE.getRue() : null)
                .adressDoeComplement(addrDOE != null ? addrDOE.getComplement() : null)
                .adressDoeVille(addrDOE != null ? addrDOE.getVille() : null)
                .adressDoeCodePostal(addrDOE != null ? addrDOE.getCodePostal() : null)
                .adresseDsePays(addrDOE != null ? addrDOE.getPays() : null)
                // Beneficiaire
                .institutionBeneficiaireId(req.getInstitutionBeneficiaireId())
                .nomInstitutionBeneficiaire(req.getNomInstitutionBeneficiaire())
                .compteBeneficiaire(req.getCompteBeneficiaire())
                .nomBeneficiaire(req.getNomBeneficiaire())
                .banqueCorrespondanteReceptriceId(req.getBanqueCorrespondanteReceptriceId())
                .nomBanqueCorrespondanteReceptrice(req.getNomBanqueCorrespondanteReceptrice())
                .compteCorrespondanceRecepteur(req.getCompteCorrespondanceRecepteur())
                // Adresse BEN (ISO 20022)
                .adresseBenRue(addrBEN != null ? addrBEN.getRue() : null)
                .adresseBenComplement(addrBEN != null ? addrBEN.getComplement() : null)
                .adresseBenVille(addrBEN != null ? addrBEN.getVille() : null)
                .adresseBenCodePostal(addrBEN != null ? addrBEN.getCodePostal() : null)
                .adresseBenPays(addrBEN != null ? addrBEN.getPays() : null)
                // BEN Effectif (Ultimate Creditor)
                .nomBeneficiaireEffectif(req.getNomBeneficiaireEffectif())
                .adressBeneRue(addrBENE != null ? addrBENE.getRue() : null)
                .adressBeneComplement(addrBENE != null ? addrBENE.getComplement() : null)
                .adressBeneVille(addrBENE != null ? addrBENE.getVille() : null)
                .adressBeneCodePostal(addrBENE != null ? addrBENE.getCodePostal() : null)
                .adressBenePays(addrBENE != null ? addrBENE.getPays() : null)
                // Cheque
                .numeroCheque(req.getNumeroCheque())
                // Tracabilite
                .creePar(userId)
                .institutionCreateurId(institutionId)
                .createdAt(now)
                .updatedAt(now)
                .build();

        op.setPreviousHash(prevHash);
        op.setHash(op.calculateHash(prevHash));

        Operation saved = operationRepository.save(op);
        addHistorique(saved, null, StatutOperation.BROUILLON, "Opération créée", userId, userName, institutionId);

        log.info("Opération créée et chaînée : {} par {} (Tenant: {})", saved.getReferenceUnique(), userId, activeTenantId);
        return toDto(saved);
    }

    // ===================== WORKFLOW =====================

    @Transactional
    public OperationDto soumettre(UUID id, String commentaire, String userId, String userName, UUID institutionId) {
        Operation op = getOperationById(id);

        // ── Screening ALM/AML sur les 4 acteurs (ISO 20022 : Dbtr, UltmtDbtr, Cdtr, UltmtCdtr) ──
        boolean matchDO  = amlService.checkSanctionMatch(op.getNomDonneurOrdre());
        boolean matchDOE = amlService.checkSanctionMatch(op.getNomDonneurOrdreEffectif());
        boolean matchBEN = amlService.checkSanctionMatch(op.getNomBeneficiaire());
        boolean matchBENE= amlService.checkSanctionMatch(op.getNomBeneficiaireEffectif());

        if (matchDO || matchDOE || matchBEN || matchBENE) {
            StringBuilder acteurs = new StringBuilder();
            if (matchDO)   acteurs.append("Donneur d'Ordre (").append(op.getNomDonneurOrdre()).append(") ");
            if (matchDOE)  acteurs.append("DO Effectif (").append(op.getNomDonneurOrdreEffectif()).append(") ");
            if (matchBEN)  acteurs.append("Bénéficiaire (").append(op.getNomBeneficiaire()).append(") ");
            if (matchBENE) acteurs.append("BEN Effectif (").append(op.getNomBeneficiaireEffectif()).append(") ");
            log.warn("[ALM Block] Correspondance détectée sur opération {} — Acteurs : {}",
                    op.getReferenceUnique(), acteurs.toString().trim());
            return changerStatut(id, StatutOperation.SUSPENDU_AML,
                    "[Alerte ALM/CFT] Correspondance détectée dans les listes de sanctions pour : "
                            + acteurs.toString().trim() + ". Opération suspendue en attente de vérification ALM.",
                    userId, userName, institutionId);
        }

        return changerStatut(id, StatutOperation.SOUMIS, commentaire, userId, userName, institutionId);
    }

    @Transactional
    public OperationDto decideAml(UUID id, String decision, String commentaire, String userId, String userName, UUID institutionId) {
        Operation op = getOperationById(id);
        if (op.getStatut() != StatutOperation.SUSPENDU_AML) {
            throw new WorkflowException("L'opération n'est pas suspendue pour vérification AML/CFT");
        }

        StatutOperation nouveauStatut;
        if ("APPROUVER".equalsIgnoreCase(decision) || "RELEASE".equalsIgnoreCase(decision)) {
            nouveauStatut = StatutOperation.SOUMIS;
        } else if ("REJETER".equalsIgnoreCase(decision) || "REJECT".equalsIgnoreCase(decision)) {
            nouveauStatut = StatutOperation.REJETE_AML;
        } else {
            throw new IllegalArgumentException("Décision AML non reconnue : " + decision);
        }

        return changerStatut(id, nouveauStatut, commentaire, userId, userName, institutionId);
    }

    @Transactional
    public OperationDto valider(UUID id, StatutOperation nouveauStatut, String commentaire,
                                 String userId, String userName, UUID institutionId) {
        Operation op = getOperationById(id);

        if (op.getCreePar().equals(userId)) {
            throw new WorkflowException("Le créateur de l'opération ne peut pas la valider (Principe des Quatre Yeux)");
        }

        // Vérification que l'institution est bien celle attendue dans le workflow
        validateActeur(op, nouveauStatut, institutionId);

        return changerStatut(id, nouveauStatut, commentaire, userId, userName, institutionId);
    }

    @Transactional
    public OperationDto rejeter(UUID id, String motifRejet, String userId, String userName, UUID institutionId) {
        Operation op = getOperationById(id);
        
        if (op.getCreePar().equals(userId)) {
            throw new WorkflowException("Le créateur de l'opération ne peut pas la rejeter (Principe des Quatre Yeux)");
        }

        StatutOperation statutRejet = getStatutRejet(op.getStatut());

        op.setCommentaireRejet(motifRejet);
        operationRepository.save(op);

        return changerStatut(id, statutRejet, motifRejet, userId, userName, institutionId);
    }

    @Transactional
    public OperationDto annuler(UUID id, String motif, String userId, UUID institutionId) {
        Operation op = getOperationById(id);

        // Seul l'émetteur peut annuler, et seulement en BROUILLON ou SOUMIS
        if (!op.getInstitutionEmettriceId().equals(institutionId)) {
            throw new WorkflowException("Seule l'institution émettrice peut annuler une opération");
        }
        if (op.getStatut() != StatutOperation.BROUILLON && op.getStatut() != StatutOperation.SOUMIS) {
            throw new WorkflowException("L'opération ne peut plus être annulée à ce stade");
        }

        return changerStatut(id, StatutOperation.ANNULE, motif, userId, userId, institutionId);
    }

    @Transactional(readOnly = true)
    public List<OperationDto> findByStatut(StatutOperation statut) {
        return operationRepository.findByStatut(statut).stream()
                .map(this::toDto)
                .collect(java.util.stream.Collectors.toList());
    }

    @Transactional
    public void updateStatusBatch(List<UUID> ids, StatutOperation nouveauStatut, String actorId, String actorNom) {
        for (UUID id : ids) {
            changerStatut(id, nouveauStatut, "Mise à jour automatique SFTP", actorId, actorNom, null);
        }
    }

    // ===================== STATS =====================

    public OperationStatsDto getStats(UUID institutionId) {
        long total = operationRepository.countByInstitution(institutionId);
        long enAttente = operationRepository.countByInstitutionAndStatuts(institutionId,
                List.of(StatutOperation.SOUMIS, StatutOperation.ACCEPTE_EMETTEUR,
                        StatutOperation.ACCEPTE_BANQUE_EMETTRICE, StatutOperation.ACCEPTE_BANQUE_RECEPTRICE));
        long comptabilises = operationRepository.countByInstitutionAndStatut(institutionId, StatutOperation.COMPTABILISE);
        long rejetes = operationRepository.countByInstitutionAndStatuts(institutionId,
                List.of(StatutOperation.REJETE, StatutOperation.REJETE_EMETTEUR,
                        StatutOperation.REJETE_BANQUE_EMETTRICE, StatutOperation.REJETE_BANQUE_RECEPTRICE));

        return new OperationStatsDto(total, enAttente, comptabilises, rejetes);
    }

    // ===================== Helpers =====================

    private OperationDto changerStatut(UUID id, StatutOperation nouveau, String commentaire,
                                        String userId, String userName, UUID institutionId) {
        Operation op = getOperationById(id);
        StatutOperation ancien = op.getStatut();

        workflowMachine.validateTransition(ancien, nouveau);

        op.setStatut(nouveau);
        Operation saved = operationRepository.save(op);
        addHistorique(saved, ancien, nouveau, commentaire, userId, userName, institutionId);

        // Publier événement sur RabbitMQ
        publishEvent(saved, ancien, nouveau);

        log.info("Opération {} : {} → {}", op.getReferenceUnique(), ancien, nouveau);
        return toDto(saved);
    }

    private void publishEvent(Operation op, StatutOperation ancien, StatutOperation nouveau) {
        try {
            OperationEvent event = new OperationEvent(
                op.getId(), op.getReferenceUnique(), op.getTypeOperation(),
                ancien, nouveau, op.getMontant(), op.getDevise(),
                op.getNomDonneurOrdre(), op.getNomBeneficiaire(),
                op.getInstitutionEmettriceId(), op.getInstitutionBeneficiaireId(),
                workflowMachine.getStatutLabel(nouveau),
                workflowMachine.getProchainActeur(nouveau),
                LocalDateTime.now()
            );
            rabbitTemplate.convertAndSend(exchange, "operation." + nouveau.name().toLowerCase(), event);
        } catch (Exception e) {
            log.error("Erreur publication événement RabbitMQ pour opération {}", op.getReferenceUnique(), e);
        }
    }

    private void addHistorique(Operation op, StatutOperation avant, StatutOperation apres,
                                String commentaire, String acteurId, String acteurNom, UUID institutionId) {
        HistoriqueStatut lastHist = historiqueRepository.findFirstByOrderByDateActionDesc();
        String prevHash = (lastHist != null && lastHist.getHash() != null) 
            ? lastHist.getHash() 
            : "0000000000000000000000000000000000000000000000000000000000000000";

        HistoriqueStatut hist = HistoriqueStatut.builder()
                .operation(op)
                .statutAvant(avant)
                .statutApres(apres)
                .commentaire(commentaire)
                .acteurId(acteurId)
                .acteurNom(acteurNom)
                .institutionId(institutionId)
                .dateAction(LocalDateTime.now())
                .previousHash(prevHash)
                .build();
        
        hist.setHash(hist.calculateHash(prevHash));
        historiqueRepository.save(hist);
    }

    private void validateActeur(Operation op, StatutOperation nouveauStatut, UUID institutionId) {
        boolean valid = switch (nouveauStatut) {
            case ACCEPTE_EMETTEUR, REJETE_EMETTEUR -> op.getInstitutionEmettriceId().equals(institutionId);
            case ACCEPTE_BANQUE_EMETTRICE, REJETE_BANQUE_EMETTRICE ->
                    op.getBanqueCorrespondanteEmettriceId() != null &&
                    op.getBanqueCorrespondanteEmettriceId().equals(institutionId);
            case ACCEPTE_BANQUE_RECEPTRICE, REJETE_BANQUE_RECEPTRICE ->
                    op.getBanqueCorrespondanteReceptriceId() != null &&
                    op.getBanqueCorrespondanteReceptriceId().equals(institutionId);
            case ACCEPTE_BENEFICIAIRE, COMPTABILISE, REJETE ->
                    op.getInstitutionBeneficiaireId().equals(institutionId);
            default -> true;
        };
        if (!valid) {
            throw new WorkflowException("Votre institution n'est pas autorisée à effectuer cette action sur cette opération");
        }
    }

    private StatutOperation getStatutRejet(StatutOperation current) {
        return switch (current) {
            case SOUMIS -> StatutOperation.REJETE_EMETTEUR;
            case ACCEPTE_EMETTEUR -> StatutOperation.REJETE_BANQUE_EMETTRICE;
            case ACCEPTE_BANQUE_EMETTRICE -> StatutOperation.REJETE_BANQUE_RECEPTRICE;
            case ACCEPTE_BANQUE_RECEPTRICE -> StatutOperation.REJETE;
            default -> StatutOperation.REJETE;
        };
    }

    private String generateReference(TypeOperation type) {
        String prefix = switch (type) {
            case VIREMENT -> "VIR";
            case CHEQUE -> "CHQ";
            case PRELEVEMENT -> "PRE";
        };
        String date = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        long seq = sequence.incrementAndGet() + operationRepository.count();
        return String.format("ML-%s-%s-%06d", prefix, date, seq);
    }

    private Operation getOperationById(UUID id) {
        return operationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Opération non trouvée: " + id));
    }

    private OperationDto toDto(Operation op) {
        return OperationDto.builder()
                .id(op.getId())
                .referenceUnique(op.getReferenceUnique())
                .typeOperation(op.getTypeOperation())
                .statut(op.getStatut())
                .statutLabel(workflowMachine.getStatutLabel(op.getStatut()))
                .dateOperation(op.getDateOperation())
                .dateValeur(op.getDateValeur())
                .montant(op.getMontant())
                .devise(op.getDevise())
                .motif(op.getMotif())
                // Émetteur
                .institutionEmettriceId(op.getInstitutionEmettriceId())
                .nomInstitutionEmettrice(op.getNomInstitutionEmettrice())
                .compteDonneurOrdre(op.getCompteDonneurOrdre())
                .nomDonneurOrdre(op.getNomDonneurOrdre())
                .banqueCorrespondanteEmettriceId(op.getBanqueCorrespondanteEmettriceId())
                .nomBanqueCorrespondanteEmettrice(op.getNomBanqueCorrespondanteEmettrice())
                .compteCorrespondanceEmetteur(op.getCompteCorrespondanceEmetteur())
                .adresseDonneurOrdre(buildAddress(
                        op.getAdresseDonRue(), op.getAdresseDonComplement(),
                        op.getAdresseDonVille(), op.getAdresseDonCodePostal(), op.getAdresseDonPays()))
                // DO Effectif
                .nomDonneurOrdreEffectif(op.getNomDonneurOrdreEffectif())
                .adresseDonneurOrdreEffectif(buildAddress(
                        op.getAdressDoeRue(), op.getAdressDoeComplement(),
                        op.getAdressDoeVille(), op.getAdressDoeCodePostal(), op.getAdresseDsePays()))
                // Bénéficiaire
                .institutionBeneficiaireId(op.getInstitutionBeneficiaireId())
                .nomInstitutionBeneficiaire(op.getNomInstitutionBeneficiaire())
                .compteBeneficiaire(op.getCompteBeneficiaire())
                .nomBeneficiaire(op.getNomBeneficiaire())
                .banqueCorrespondanteReceptriceId(op.getBanqueCorrespondanteReceptriceId())
                .nomBanqueCorrespondanteReceptrice(op.getNomBanqueCorrespondanteReceptrice())
                .compteCorrespondanceRecepteur(op.getCompteCorrespondanceRecepteur())
                .adresseBeneficiaire(buildAddress(
                        op.getAdresseBenRue(), op.getAdresseBenComplement(),
                        op.getAdresseBenVille(), op.getAdresseBenCodePostal(), op.getAdresseBenPays()))
                // BEN Effectif
                .nomBeneficiaireEffectif(op.getNomBeneficiaireEffectif())
                .adresseBeneficiaireEffectif(buildAddress(
                        op.getAdressBeneRue(), op.getAdressBeneComplement(),
                        op.getAdressBeneVille(), op.getAdressBeneCodePostal(), op.getAdressBenePays()))
                .numeroCheque(op.getNumeroCheque())
                .commentaireRejet(op.getCommentaireRejet())
                .creePar(op.getCreePar())
                .createdAt(op.getCreatedAt())
                .updatedAt(op.getUpdatedAt())
                .previousHash(op.getPreviousHash())
                .hash(op.getHash())
                .build();
    }

    /**
     * Construit un PostalAddressDto uniquement si au moins un champ est renseigné.
     */
    private PostalAddressDto buildAddress(String rue, String complement, String ville, String codePostal, String pays) {
        if (rue == null && complement == null && ville == null && codePostal == null && pays == null) {
            return null;
        }
        return PostalAddressDto.builder()
                .rue(rue).complement(complement).ville(ville).codePostal(codePostal).pays(pays)
                .build();
    }

    // ===================== IMPORT EN MASSE (Excel) =====================

    /**
     * Importe une liste d'opérations depuis un fichier Excel.
     *
     * Colonnes attendues dans le fichier (1 entête, données à partir de la ligne 2) :
     *   A: compte_donneur_ordre   (obligatoire si typeDebit=UNITAIRE, ignoré si GLOBAL)
     *   B: nom_donneur_ordre      (obligatoire si typeDebit=UNITAIRE, ignoré si GLOBAL)
     *   C: compte_beneficiaire    (obligatoire)
     *   D: nom_beneficiaire       (obligatoire)
     *   E: montant                (obligatoire, décimal)
     *   F: devise                 (obligatoire, ex : XOF)
     *   G: motif                  (optionnel)
     *   H: nom_do_effectif        (optionnel)
     *   I: nom_ben_effectif       (optionnel)
     *
     * @param file                        Fichier Excel (.xlsx ou .xls)
     * @param typeDebit                   "GLOBAL" ou "UNITAIRE"
     * @param institutionEmettriceId      UUID de l'institution émettrice
     * @param nomInstitutionEmettrice     Nom de l'institution émettrice
     * @param institutionBeneficiaireId   UUID de l'institution bénéficiaire
     * @param nomInstitutionBeneficiaire  Nom de l'institution bénéficiaire
     * @param compteDonneurOrdreGlobal    Numéro de compte DO global (si typeDebit=GLOBAL)
     * @param nomDonneurOrdreGlobal       Nom DO global (si typeDebit=GLOBAL)
     * @param typeOperation               Type d'opération (défaut : VIREMENT)
     */
    @Transactional
    public BulkOperationResult createBulk(
            MultipartFile file,
            String typeDebit,
            UUID institutionEmettriceId,
            String nomInstitutionEmettrice,
            UUID institutionBeneficiaireId,
            String nomInstitutionBeneficiaire,
            String compteDonneurOrdreGlobal,
            String nomDonneurOrdreGlobal,
            com.microlinks.operation.entity.TypeOperation typeOperation,
            String userId,
            String userName,
            UUID institutionId) {

        boolean isGlobal = "GLOBAL".equalsIgnoreCase(typeDebit);
        List<BulkOperationLineResult> details = new ArrayList<>();
        int totalSucces = 0;
        int totalErreurs = 0;

        try (org.apache.poi.ss.usermodel.Workbook workbook =
                     org.apache.poi.ss.usermodel.WorkbookFactory.create(file.getInputStream())) {

            org.apache.poi.ss.usermodel.Sheet sheet = workbook.getSheetAt(0);
            // Ligne 0 = entête, données à partir de 1
            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                org.apache.poi.ss.usermodel.Row row = sheet.getRow(i);
                if (row == null) continue;

                String compteDO, nomDO;
                if (isGlobal) {
                    compteDO = compteDonneurOrdreGlobal != null ? compteDonneurOrdreGlobal : "";
                    nomDO    = nomDonneurOrdreGlobal   != null ? nomDonneurOrdreGlobal   : "";
                } else {
                    compteDO = cellValue(row.getCell(0));
                    nomDO    = cellValue(row.getCell(1));
                }

                String compteBen  = cellValue(row.getCell(2));
                String nomBen     = cellValue(row.getCell(3));
                String montantStr = cellValue(row.getCell(4));
                String devise     = cellValue(row.getCell(5));
                String motif      = cellValue(row.getCell(6));
                String nomDOE     = cellValue(row.getCell(7));
                String nomBENE    = cellValue(row.getCell(8));

                try {
                    if (compteDO.isBlank() || nomDO.isBlank() || compteBen.isBlank() || nomBen.isBlank() || montantStr.isBlank()) {
                        throw new IllegalArgumentException("Données obligatoires manquantes (compte DO, nom DO, compte BEN, nom BEN, montant)");
                    }
                    BigDecimal montant = new BigDecimal(montantStr.replace(",", ".").trim());
                    if (devise.isBlank()) devise = "XOF";

                    OperationCreateRequest req = new OperationCreateRequest();
                    req.setTypeOperation(typeOperation != null ? typeOperation : com.microlinks.operation.entity.TypeOperation.VIREMENT);
                    req.setDateOperation(LocalDate.now());
                    req.setMontant(montant);
                    req.setDevise(devise);
                    req.setMotif(motif.isBlank() ? null : motif);
                    req.setInstitutionEmettriceId(institutionEmettriceId);
                    req.setNomInstitutionEmettrice(nomInstitutionEmettrice);
                    req.setCompteDonneurOrdre(compteDO);
                    req.setNomDonneurOrdre(nomDO);
                    req.setNomDonneurOrdreEffectif(nomDOE.isBlank() ? null : nomDOE);
                    req.setInstitutionBeneficiaireId(institutionBeneficiaireId);
                    req.setNomInstitutionBeneficiaire(nomInstitutionBeneficiaire);
                    req.setCompteBeneficiaire(compteBen);
                    req.setNomBeneficiaire(nomBen);
                    req.setNomBeneficiaireEffectif(nomBENE.isBlank() ? null : nomBENE);

                    OperationDto created = create(req, userId, userName, institutionId);
                    details.add(BulkOperationLineResult.builder()
                            .numeroLigne(i)
                            .succes(true)
                            .referenceCreee(created.getReferenceUnique())
                            .build());
                    totalSucces++;
                } catch (Exception e) {
                    log.warn("[Bulk Import] Erreur ligne {} : {}", i, e.getMessage());
                    details.add(BulkOperationLineResult.builder()
                            .numeroLigne(i)
                            .succes(false)
                            .erreur(e.getMessage())
                            .build());
                    totalErreurs++;
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Erreur lecture fichier Excel : " + e.getMessage(), e);
        }

        log.info("[Bulk Import] {} opérations créées, {} erreurs — typeDebit={}", totalSucces, totalErreurs, typeDebit);
        return BulkOperationResult.builder()
                .totalLignes(totalSucces + totalErreurs)
                .totalSucces(totalSucces)
                .totalErreurs(totalErreurs)
                .typeDebit(typeDebit)
                .details(details)
                .build();
    }

    /** Lit la valeur d'une cellule Excel comme String, en gérant tous les types. */
    private String cellValue(org.apache.poi.ss.usermodel.Cell cell) {
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case STRING  -> cell.getStringCellValue().trim();
            case NUMERIC -> org.apache.poi.ss.usermodel.DateUtil.isCellDateFormatted(cell)
                    ? cell.getLocalDateTimeCellValue().toLocalDate().toString()
                    : String.valueOf(cell.getNumericCellValue());
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            case FORMULA -> cell.getCachedFormulaResultType() == org.apache.poi.ss.usermodel.CellType.NUMERIC
                    ? String.valueOf(cell.getNumericCellValue())
                    : cell.getRichStringCellValue().getString().trim();
            default -> "";
        };
    }

    public SecurityScanResult runSecurityScan() {
        List<Operation> operations = operationRepository.findAll();
        List<String> corruptedOps = new java.util.ArrayList<>();
        
        // 1. Vérification des checksums internes
        for (Operation op : operations) {
            String calculated = op.calculateChecksum();
            if (op.getChecksum() == null || !op.getChecksum().equals(calculated)) {
                corruptedOps.add(op.getReferenceUnique() + " (ID: " + op.getId() + ")");
            }
        }

        // 2. Vérification du chaînage blockchain des Opérations
        List<Operation> sortedOps = operationRepository.findAll(Sort.by(Sort.Direction.ASC, "createdAt"));
        List<String> corruptedBlockchain = new java.util.ArrayList<>();
        String expectedOpPrevHash = "0000000000000000000000000000000000000000000000000000000000000000";

        for (Operation op : sortedOps) {
            if (op.getPreviousHash() == null || !op.getPreviousHash().equals(expectedOpPrevHash)) {
                corruptedBlockchain.add(op.getReferenceUnique() + " (Lien blockchain rompu - Attendu: " 
                        + expectedOpPrevHash + ", Obtenu: " + op.getPreviousHash() + ")");
            } else {
                String calculatedHash = op.calculateHash(op.getPreviousHash());
                if (op.getHash() == null || !op.getHash().equals(calculatedHash)) {
                    corruptedBlockchain.add(op.getReferenceUnique() + " (Hash blockchain invalide - Attendu: " 
                            + calculatedHash + ", Obtenu: " + op.getHash() + ")");
                }
            }
            expectedOpPrevHash = op.getHash() != null ? op.getHash() : "";
        }

        // 3. Calcul de la racine de Merkle
        List<String> opHashes = sortedOps.stream()
                .map(Operation::getHash)
                .filter(h -> h != null && !h.isBlank())
                .toList();
        MerkleTree merkleTree = new MerkleTree(opHashes);
        String merkleRoot = merkleTree.getRootHash();

        // 4. Vérification du chaînage blockchain des Historiques
        List<HistoriqueStatut> history = historiqueRepository.findAll(Sort.by(Sort.Direction.ASC, "dateAction"));
        List<String> corruptedHist = new java.util.ArrayList<>();
        
        String expectedPrevHash = "0000000000000000000000000000000000000000000000000000000000000000";
        for (HistoriqueStatut hist : history) {
            if (hist.getPreviousHash() == null || !hist.getPreviousHash().equals(expectedPrevHash)) {
                corruptedHist.add("Lien historique rompu pour l'ID " + hist.getId() + " de l'opération " + 
                    (hist.getOperation() != null ? hist.getOperation().getReferenceUnique() : "Inconnue"));
            } else {
                String calculatedHash = hist.calculateHash(hist.getPreviousHash());
                if (hist.getHash() == null || !hist.getHash().equals(calculatedHash)) {
                    corruptedHist.add("Empreinte historique invalide pour l'ID " + hist.getId() + " de l'opération " + 
                        (hist.getOperation() != null ? hist.getOperation().getReferenceUnique() : "Inconnue"));
                }
            }
            expectedPrevHash = hist.getHash() != null ? hist.getHash() : "";
        }

        int totalCorruptions = corruptedOps.size() + corruptedHist.size() + corruptedBlockchain.size();
        String status = "SECURE";
        if (corruptedBlockchain.size() > 0 || totalCorruptions >= 10) {
            status = "CRITICAL";
        } else if (totalCorruptions > 0) {
            status = "WARNING";
        }

        return SecurityScanResult.builder()
                .totalOperationsChecked(operations.size())
                .totalHistoryLogsChecked(history.size())
                .corruptedOperationIds(corruptedOps)
                .corruptedHistoryLogIds(corruptedHist)
                .corruptedBlockchainIds(corruptedBlockchain)
                .merkleRoot(merkleRoot)
                .totalCorruptions(totalCorruptions)
                .status(status)
                .scanTimestamp(LocalDateTime.now())
                .build();
    }
}
