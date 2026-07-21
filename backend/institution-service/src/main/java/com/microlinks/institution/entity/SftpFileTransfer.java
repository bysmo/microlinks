package com.microlinks.institution.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "sftp_file_transfers")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SftpFileTransfer {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "nom_fichier", nullable = false)
    private String nomFichier;

    @Column(name = "type_fichier", nullable = false, length = 20)
    private String typeFichier;

    @Column(name = "taille_bytes", nullable = false)
    private Long tailleBytes;

    @Column(name = "type_evenement", nullable = false, length = 20)
    private String typeEvenement; // COLLECTE, DEPOSE, ERREUR

    @Column(nullable = false, length = 20)
    private String statut; // SUCCES, ECHEC

    @Column(name = "institution_source_id")
    private UUID institutionSourceId;

    @Column(name = "institution_source_code", length = 50)
    private String institutionSourceCode;

    @Column(name = "institution_dest_id")
    private UUID institutionDestId;

    @Column(name = "institution_dest_code", length = 50)
    private String institutionDestCode;

    @Column(name = "message_erreur", columnDefinition = "TEXT")
    private String messageErreur;

    @Column(name = "chemin_destination", length = 500)
    private String cheminDestination;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime timestamp;
}
