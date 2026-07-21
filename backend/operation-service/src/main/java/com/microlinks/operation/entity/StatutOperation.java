package com.microlinks.operation.entity;

/**
 * Workflow de validation des opérations MicroLinks
 *
 * BROUILLON -> SOUMIS -> ACCEPTE_EMETTEUR -> ACCEPTE_BANQUE_EMETTRICE
 *           -> ACCEPTE_BANQUE_RECEPTRICE -> ACCEPTE_BENEFICIAIRE (=COMPTABILISE)
 *
 * À chaque étape, l'acteur concerné peut rejeter => REJETE
 * L'émetteur peut annuler avant soumission => ANNULE
 */
public enum StatutOperation {
    BROUILLON,              // Saisie en cours
    SOUMIS,                 // Soumis par l'émetteur, en attente validation agent émetteur
    ACCEPTE_EMETTEUR,       // Validé par agent de l'institution émettrice
    REJETE_EMETTEUR,        // Rejeté par l'institution émettrice
    ACCEPTE_BANQUE_EMETTRICE,   // Validé par la banque correspondante de l'émetteur
    REJETE_BANQUE_EMETTRICE,    // Rejeté par la banque correspondante de l'émetteur
    TRANSMISSING,               // En cours de transmission SFTP
    TRANSMITTED,                // Transmis à l'institution réceptrice
    ACCEPTE_BANQUE_RECEPTRICE,  // Validé par la banque correspondante du bénéficiaire
    REJETE_BANQUE_RECEPTRICE,   // Rejeté par la banque correspondante du bénéficiaire
    ACCEPTE_BENEFICIAIRE,       // Validé et comptabilisé par l'institution bénéficiaire
    COMPTABILISE,               // Opération finalisée et comptabilisée
    REJETE,                     // Rejet définitif
    ANNULE,                     // Annulé par l'émetteur
    SUSPENDU_AML,               // Suspendu pour vérification AML/CFT
    REJETE_AML                  // Rejeté pour motif AML/CFT
}
