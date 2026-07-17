package com.microlinks.billing.entity;

/**
 * Mode de facturation appliqué à une institution.
 * PAR_OPERATION : facturation au nombre d'opérations réalisées sur la période.
 * FORFAIT       : abonnement périodique à montant fixe (mensuel).
 */
public enum ModePaiement {
    PAR_OPERATION,
    FORFAIT
}
