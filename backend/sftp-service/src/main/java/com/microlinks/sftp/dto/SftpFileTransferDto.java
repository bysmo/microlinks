package com.microlinks.sftp.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class SftpFileTransferDto {
    private UUID id;
    private String nomFichier;
    private String typeFichier;
    private Long tailleBytes;
    private String typeEvenement; // COLLECTE, DEPOSE, ERREUR
    private String statut; // SUCCES, ECHEC
    private UUID institutionSourceId;
    private String institutionSourceCode;
    private UUID institutionDestId;
    private String institutionDestCode;
    private String messageErreur;
    private String cheminDestination;
    private LocalDateTime timestamp;
}
