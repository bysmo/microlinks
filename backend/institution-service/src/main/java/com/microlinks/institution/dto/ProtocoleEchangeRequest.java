package com.microlinks.institution.dto;

import com.microlinks.institution.entity.TypeFichierEchange;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.Data;
import java.util.List;

/**
 * Request DTO pour la configuration du protocole d'échange de fichiers.
 * Accessible par ADMIN_INSTITUTION (propre institution) et ADMIN_PLATEFORME.
 *
 * Le mot de passe est optionnel : si null/vide, la valeur existante est conservée.
 */
@Data
public class ProtocoleEchangeRequest {

    /** Protocole : SFTP, FTP, ou FTPS */
    @Size(max = 10)
    private String protocole;

    /** Nom d'hôte du serveur (IP ou FQDN) */
    @Size(max = 200, message = "Le nom d'hôte ne peut pas dépasser 200 caractères")
    private String nomHote;

    /** Adresse IP du serveur */
    @Size(max = 45, message = "L'adresse IP ne peut pas dépasser 45 caractères")
    private String adresseIp;

    /** Port de connexion */
    @Size(max = 6)
    private String port;

    /** Nom d'utilisateur */
    @Size(max = 100, message = "L'utilisateur ne peut pas dépasser 100 caractères")
    private String utilisateur;

    /**
     * Mot de passe / passphrase.
     * Si null ou vide, la valeur existante en base est conservée.
     */
    private String motDePasse;

    /** Répertoire d'entrée (réception) */
    @Size(max = 500)
    private String repertoireEntree;

    /** Répertoire de sortie (émission) */
    @Size(max = 500)
    private String repertoireSortie;

    /** Répertoire d'archivage */
    @Size(max = 500)
    private String repertoireArchivage;

    /** Types de fichiers que l'institution peut envoyer vers la plateforme */
    private List<TypeFichierEchange> typesFichiersEnvoi;

    /** Types de fichiers que l'institution peut recevoir de la plateforme */
    private List<TypeFichierEchange> typesFichiersReception;

    /** Indique si la configuration est active */
    private Boolean actif;
}

