package com.microlinks.institution.entity;

/**
 * Types de fichiers de transactions supportés sur la plateforme MicroLinks
 * pour les échanges inter-institutions via SFTP.
 */
public enum TypeFichierEchange {

    /** Messages SWIFT MT (ex: MT103, MT202) */
    MT,

    /** Messages ISO 20022 MX (paiements, relevés…) */
    MX,

    /** Format AFB (Association Française des Banques) */
    AFB,

    /** Fichiers Excel (.xlsx) */
    XLSX,

    /** Fichiers CSV (valeurs séparées par virgule ou point-virgule) */
    CSV,

    /** Fichiers XML génériques */
    XML,

    /** Fichiers JSON génériques */
    JSON
}
