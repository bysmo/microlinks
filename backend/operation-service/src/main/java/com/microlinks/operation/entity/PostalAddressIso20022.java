package com.microlinks.operation.entity;

import lombok.*;

/**
 * Adresse postale structurée conforme au standard ISO 20022 (PostalAddress24).
 * Utilisée pour les acteurs principaux et effectifs d'une opération financière.
 *
 * Correspondance ISO 20022 :
 *   rue            → StrtNm  (Street Name)
 *   complement     → BldgNm  (Building Name / Address Line 2)
 *   ville          → TwnNm   (Town Name)
 *   codePostal     → PstCd   (Post Code)
 *   pays           → Ctry    (Country — ISO 3166-1 alpha-2)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PostalAddressIso20022 {

    /**
     * Rue et numéro — ISO 20022 : StrtNm.
     * Exemple : "12 Avenue des Champs-Élysées"
     */
    private String rue;

    /**
     * Complément d'adresse (bâtiment, appartement, BP…) — ISO 20022 : BldgNm.
     * Exemple : "Bâtiment B, 3ème étage"
     */
    private String complement;

    /**
     * Ville — ISO 20022 : TwnNm.
     * Exemple : "Dakar"
     */
    private String ville;

    /**
     * Code postal — ISO 20022 : PstCd.
     * Exemple : "10000"
     */
    private String codePostal;

    /**
     * Code pays ISO 3166-1 alpha-2 — ISO 20022 : Ctry.
     * Exemple : "SN" pour Sénégal, "CM" pour Cameroun.
     */
    private String pays;
}
