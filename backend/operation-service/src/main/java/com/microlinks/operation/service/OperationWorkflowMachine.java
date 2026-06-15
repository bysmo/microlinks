package com.microlinks.operation.service;

import com.microlinks.operation.entity.StatutOperation;
import com.microlinks.operation.exception.WorkflowException;
import org.springframework.stereotype.Component;
import java.util.Map;
import java.util.Set;

/**
 * Machine à états du workflow de validation des opérations MicroLinks.
 * Définit les transitions autorisées entre statuts.
 */
@Component
public class OperationWorkflowMachine {

    private static final Map<StatutOperation, Set<StatutOperation>> TRANSITIONS = Map.of(
        StatutOperation.BROUILLON, Set.of(
            StatutOperation.SOUMIS,
            StatutOperation.SUSPENDU_AML,
            StatutOperation.ANNULE
        ),
        StatutOperation.SOUMIS, Set.of(
            StatutOperation.ACCEPTE_EMETTEUR,
            StatutOperation.REJETE_EMETTEUR,
            StatutOperation.ANNULE
        ),
        StatutOperation.SUSPENDU_AML, Set.of(
            StatutOperation.SOUMIS,
            StatutOperation.REJETE_AML
        ),
        StatutOperation.ACCEPTE_EMETTEUR, Set.of(
            StatutOperation.ACCEPTE_BANQUE_EMETTRICE,
            StatutOperation.REJETE_BANQUE_EMETTRICE
        ),
        StatutOperation.ACCEPTE_BANQUE_EMETTRICE, Set.of(
            StatutOperation.ACCEPTE_BANQUE_RECEPTRICE,
            StatutOperation.REJETE_BANQUE_RECEPTRICE
        ),
        StatutOperation.ACCEPTE_BANQUE_RECEPTRICE, Set.of(
            StatutOperation.ACCEPTE_BENEFICIAIRE,
            StatutOperation.REJETE
        ),
        StatutOperation.ACCEPTE_BENEFICIAIRE, Set.of(
            StatutOperation.COMPTABILISE
        )
    );

    /**
     * Vérifie si la transition de statut est autorisée.
     */
    public void validateTransition(StatutOperation current, StatutOperation next) {
        Set<StatutOperation> allowed = TRANSITIONS.get(current);
        if (allowed == null || !allowed.contains(next)) {
            throw new WorkflowException(
                String.format("Transition non autorisée : %s → %s", current, next)
            );
        }
    }

    /**
     * Retourne le label lisible du statut pour les notifications.
     */
    public String getStatutLabel(StatutOperation statut) {
        return switch (statut) {
            case BROUILLON -> "Brouillon";
            case SOUMIS -> "Soumis - En attente de validation";
            case ACCEPTE_EMETTEUR -> "Accepté par l'institution émettrice";
            case REJETE_EMETTEUR -> "Rejeté par l'institution émettrice";
            case ACCEPTE_BANQUE_EMETTRICE -> "Accepté par la banque émettrice";
            case REJETE_BANQUE_EMETTRICE -> "Rejeté par la banque émettrice";
            case ACCEPTE_BANQUE_RECEPTRICE -> "Accepté par la banque réceptrice";
            case REJETE_BANQUE_RECEPTRICE -> "Rejeté par la banque réceptrice";
            case ACCEPTE_BENEFICIAIRE -> "Accepté par l'institution bénéficiaire";
            case COMPTABILISE -> "Comptabilisé avec succès";
            case REJETE -> "Rejeté définitivement";
            case ANNULE -> "Annulé";
            case SUSPENDU_AML -> "Suspendu - AML/CFT";
            case REJETE_AML -> "Rejeté - AML/CFT";
        };
    }

    /**
     * Détermine le prochain acteur à notifier selon le statut actuel.
     */
    public String getProchainActeur(StatutOperation statut) {
        return switch (statut) {
            case SOUMIS -> "L'agent de validation de l'institution émettrice doit valider cette opération";
            case ACCEPTE_EMETTEUR -> "La banque correspondante de l'institution émettrice doit valider";
            case ACCEPTE_BANQUE_EMETTRICE -> "La banque correspondante de l'institution bénéficiaire doit valider";
            case ACCEPTE_BANQUE_RECEPTRICE -> "L'institution bénéficiaire doit accepter et comptabiliser";
            case ACCEPTE_BENEFICIAIRE -> "Opération prête à être comptabilisée";
            case SUSPENDU_AML -> "Le service de conformité AML/CFT doit valider cette opération";
            default -> "";
        };
    }
}
