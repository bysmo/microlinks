package com.microlinks.institution.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Request DTO pour la configuration du protocole d'échange de fichiers.
 * Accessible par ADMIN_INSTITUTION (propre institution) et ADMIN_PLATEFORME.
 *
 * La configuration est séparée en deux sens indépendants :
 * - {@code entree} : fichiers reçus depuis la plateforme vers l'institution
 * - {@code sortie} : fichiers envoyés par l'institution vers la plateforme
 *
 * Les mots de passe sont optionnels : si null/vide, la valeur existante est conservée.
 */
@Data
public class ProtocoleEchangeRequest {

    /** Nom d'hôte du serveur partagé (IP ou FQDN) */
    @Size(max = 200, message = "Le nom d'hôte ne peut pas dépasser 200 caractères")
    private String nomHote;

    /** Adresse IP du serveur partagé */
    @Size(max = 45, message = "L'adresse IP ne peut pas dépasser 45 caractères")
    private String adresseIp;

    /** Configuration du sens ENTRÉE (réception depuis la plateforme) */
    @Valid
    private SensEchangeRequest entree;

    /** Configuration du sens SORTIE (émission vers la plateforme) */
    @Valid
    private SensEchangeRequest sortie;

    /** Indique si la configuration est active */
    private Boolean actif;
}
