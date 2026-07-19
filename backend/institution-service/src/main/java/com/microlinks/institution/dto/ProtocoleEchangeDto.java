package com.microlinks.institution.dto;

import lombok.Data;

/**
 * DTO de configuration du protocole d'échange de fichiers d'une institution.
 * Accessible par ADMIN_INSTITUTION et ADMIN_PLATEFORME.
 * Les données sensibles (mot de passe) ne sont jamais retournées.
 *
 * La configuration est séparée en deux sens indépendants :
 * - {@code entree} : fichiers reçus depuis la plateforme vers l'institution
 * - {@code sortie} : fichiers envoyés par l'institution vers la plateforme
 */
@Data
public class ProtocoleEchangeDto {

    /** Nom d'hôte du serveur partagé (IP ou nom de domaine) */
    private String nomHote;

    /** Adresse IP du serveur partagé */
    private String adresseIp;

    /** Configuration du sens ENTRÉE (réception depuis la plateforme) */
    private SensEchangeDto entree;

    /** Configuration du sens SORTIE (émission vers la plateforme) */
    private SensEchangeDto sortie;

    /** Indique si la configuration est active */
    private Boolean actif;
}
