package com.microlinks.institution.dto;

import lombok.Data;

/**
 * DTO représentant la configuration d'un sens d'échange (ENTRÉE ou SORTIE).
 * Les données sensibles (mot de passe) ne sont jamais retournées : seul
 * {@code motDePasseConfigured} indique si un mot de passe est défini.
 */
@Data
public class SensEchangeDto {

    /** Protocole utilisé : SFTP, FTP, FTPS */
    private String protocole;

    /** Type de fichier unique pour ce sens d'échange : MT, MX, AFB, CSV, XLSX, XML, JSON */
    private String typeFichier;

    /** Répertoire sur le serveur pour ce sens */
    private String repertoire;

    /** Nom d'utilisateur / login */
    private String utilisateur;

    /** Port de connexion */
    private String port;

    /** Indique si un mot de passe est configuré (sans révéler sa valeur) */
    private boolean motDePasseConfigured;
}
