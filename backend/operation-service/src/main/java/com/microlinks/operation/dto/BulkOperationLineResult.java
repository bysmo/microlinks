package com.microlinks.operation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Résultat d'une ligne lors d'un import en masse d'opérations depuis Excel.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkOperationLineResult {
    /** Numéro de ligne dans le fichier Excel (1-based, hors entête) */
    private int numeroLigne;
    /** true si la ligne a été créée avec succès */
    private boolean succes;
    /** Référence de l'opération créée (null si erreur) */
    private String referenceCreee;
    /** Message d'erreur (null si succès) */
    private String erreur;
}
