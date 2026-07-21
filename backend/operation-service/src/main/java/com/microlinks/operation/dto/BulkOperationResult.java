package com.microlinks.operation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

/**
 * Résumé global d'un import en masse d'opérations depuis un fichier Excel.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkOperationResult {
    /** Nombre total de lignes traitées */
    private int totalLignes;
    /** Nombre de lignes créées avec succès */
    private int totalSucces;
    /** Nombre de lignes en erreur */
    private int totalErreurs;
    /** Mode de débit appliqué : GLOBAL ou UNITAIRE */
    private String typeDebit;
    /** Détail ligne par ligne */
    private List<BulkOperationLineResult> details;
}
