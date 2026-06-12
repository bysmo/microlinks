package com.microlinks.operation.service;

import com.microlinks.operation.dto.*;
import com.microlinks.operation.entity.*;
import com.microlinks.operation.exception.*;
import com.microlinks.operation.repository.OperationRepository;
import com.microlinks.operation.repository.HistoriqueStatutRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
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
        Operation op = Operation.builder()
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
                // Beneficiaire
                .institutionBeneficiaireId(req.getInstitutionBeneficiaireId())
                .nomInstitutionBeneficiaire(req.getNomInstitutionBeneficiaire())
                .compteBeneficiaire(req.getCompteBeneficiaire())
                .nomBeneficiaire(req.getNomBeneficiaire())
                .banqueCorrespondanteReceptriceId(req.getBanqueCorrespondanteReceptriceId())
                .nomBanqueCorrespondanteReceptrice(req.getNomBanqueCorrespondanteReceptrice())
                .compteCorrespondanceRecepteur(req.getCompteCorrespondanceRecepteur())
                // Cheque
                .numeroCheque(req.getNumeroCheque())
                // Tracabilite
                .creePar(userId)
                .institutionCreateurId(institutionId)
                .build();

        Operation saved = operationRepository.save(op);
        addHistorique(saved, null, StatutOperation.BROUILLON, "Opération créée", userId, userName, institutionId);

        log.info("Opération créée : {} par {}", saved.getReferenceUnique(), userId);
        return toDto(saved);
    }

    // ===================== WORKFLOW =====================

    @Transactional
    public OperationDto soumettre(UUID id, String commentaire, String userId, String userName, UUID institutionId) {
        return changerStatut(id, StatutOperation.SOUMIS, commentaire, userId, userName, institutionId);
    }

    @Transactional
    public OperationDto valider(UUID id, StatutOperation nouveauStatut, String commentaire,
                                 String userId, String userName, UUID institutionId) {
        Operation op = getOperationById(id);

        // Vérification que l'institution est bien celle attendue dans le workflow
        validateActeur(op, nouveauStatut, institutionId);

        return changerStatut(id, nouveauStatut, commentaire, userId, userName, institutionId);
    }

    @Transactional
    public OperationDto rejeter(UUID id, String motifRejet, String userId, String userName, UUID institutionId) {
        Operation op = getOperationById(id);
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
        HistoriqueStatut hist = HistoriqueStatut.builder()
                .operation(op)
                .statutAvant(avant)
                .statutApres(apres)
                .commentaire(commentaire)
                .acteurId(acteurId)
                .acteurNom(acteurNom)
                .institutionId(institutionId)
                .dateAction(LocalDateTime.now())
                .build();
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
                .institutionEmettriceId(op.getInstitutionEmettriceId())
                .nomInstitutionEmettrice(op.getNomInstitutionEmettrice())
                .compteDonneurOrdre(op.getCompteDonneurOrdre())
                .nomDonneurOrdre(op.getNomDonneurOrdre())
                .banqueCorrespondanteEmettriceId(op.getBanqueCorrespondanteEmettriceId())
                .nomBanqueCorrespondanteEmettrice(op.getNomBanqueCorrespondanteEmettrice())
                .compteCorrespondanceEmetteur(op.getCompteCorrespondanceEmetteur())
                .institutionBeneficiaireId(op.getInstitutionBeneficiaireId())
                .nomInstitutionBeneficiaire(op.getNomInstitutionBeneficiaire())
                .compteBeneficiaire(op.getCompteBeneficiaire())
                .nomBeneficiaire(op.getNomBeneficiaire())
                .banqueCorrespondanteReceptriceId(op.getBanqueCorrespondanteReceptriceId())
                .nomBanqueCorrespondanteReceptrice(op.getNomBanqueCorrespondanteReceptrice())
                .compteCorrespondanceRecepteur(op.getCompteCorrespondanceRecepteur())
                .numeroCheque(op.getNumeroCheque())
                .commentaireRejet(op.getCommentaireRejet())
                .creePar(op.getCreePar())
                .createdAt(op.getCreatedAt())
                .updatedAt(op.getUpdatedAt())
                .build();
    }
}
