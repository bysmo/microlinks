package com.microlinks.operation.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Adresse postale structurée au format ISO 20022 (PostalAddress24).
 *
 * Champs ISO 20022 :
 *   rue         → StrtNm  (Street Name)
 *   complement  → BldgNm  (Building Name)
 *   ville       → TwnNm   (Town Name)
 *   codePostal  → PstCd   (Post Code)
 *   pays        → Ctry    (Country — ISO 3166-1 alpha-2)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PostalAddressDto {

    @Size(max = 255, message = "La rue ne peut pas dépasser 255 caractères")
    private String rue;

    @Size(max = 255, message = "Le complément d'adresse ne peut pas dépasser 255 caractères")
    private String complement;

    @Size(max = 100, message = "La ville ne peut pas dépasser 100 caractères")
    private String ville;

    @Size(max = 20, message = "Le code postal ne peut pas dépasser 20 caractères")
    private String codePostal;

    /**
     * Code pays ISO 3166-1 alpha-2 (2 lettres majuscules).
     * Exemples : SN, CM, CI, FR, BE, DE
     */
    @Pattern(regexp = "^[A-Z]{2}$", message = "Le code pays doit être au format ISO 3166-1 alpha-2 (ex: SN, CM, FR)")
    @Size(min = 2, max = 2, message = "Le code pays doit faire exactement 2 caractères")
    private String pays;
}
