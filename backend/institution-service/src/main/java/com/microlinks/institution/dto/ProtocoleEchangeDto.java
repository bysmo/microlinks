package com.microlinks.institution.dto;

import com.microlinks.institution.entity.TypeFichierEchange;
import lombok.Data;
import java.util.List;

/**
 * DTO de configuration du protocole d'échange de fichiers d'une institution.
 * Accessible par ADMIN_INSTITUTION et ADMIN_PLATEFORME.
 * Les données sensibles (mot de passe) ne sont jamais retournées.
 */
@Data
public class ProtocoleEchangeDto {

    /** Protocole utilisé : SFTP, FTP, FTPS */
    private String protocole;

    /** Nom d'hôte du serveur (IP ou nom de domaine) */
    private String nomHote;

    /** Adresse IP du serveur */
    private String adresseIp;

    /** Port de connexion (défaut : 22 pour SFTP, 21 pour FTP, 990 pour FTPS) */
    private String port;

    /** Nom d'utilisateur */
    private String utilisateur;

    /** Indique si un mot de passe est configuré (sans révéler sa valeur) */
    private boolean motDePasseConfigured;

    /** Répertoire d'entrée (réception des fichiers entrants) */
    private String repertoireEntree;

    /** Répertoire de sortie (émission des fichiers vers la plateforme) */
    private String repertoireSortie;

    /** Répertoire d'archivage des fichiers traités */
    private String repertoireArchivage;

    /** Types de fichiers que cette institution peut envoyer vers la plateforme */
    private List<TypeFichierEchange> typesFichiersEnvoi;

    /** Types de fichiers que cette institution peut recevoir de la plateforme */
    private List<TypeFichierEchange> typesFichiersReception;

    /** Indique si la configuration est active */
    private Boolean actif;
}

