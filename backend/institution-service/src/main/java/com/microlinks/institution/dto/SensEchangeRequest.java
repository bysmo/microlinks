package com.microlinks.institution.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Request DTO représentant la configuration d'un sens d'échange (ENTRÉE ou SORTIE).
 * Si {@code motDePasse} est null ou vide, la valeur existante en base est conservée.
 */
@Data
public class SensEchangeRequest {

    /** Protocole : SFTP, FTP, FTPS */
    @Size(max = 10)
    private String protocole;

    /** Type de fichier unique pour ce sens : MT, MX, AFB, CSV, XLSX, XML, JSON */
    @Size(max = 10)
    private String typeFichier;

    /** Répertoire sur le serveur */
    @Size(max = 500)
    private String repertoire;

    /** Nom d'utilisateur / login */
    @Size(max = 100)
    private String utilisateur;

    /** Port de connexion */
    @Size(max = 6)
    private String port;

    /**
     * Mot de passe / passphrase.
     * Si null ou vide, la valeur existante en base est conservée.
     */
    private String motDePasse;
}
