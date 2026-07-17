package com.microlinks.operation.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "historique_statuts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HistoriqueStatut {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "operation_id", nullable = false)
    private Operation operation;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut_avant", length = 40)
    private StatutOperation statutAvant;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut_apres", nullable = false, length = 40)
    private StatutOperation statutApres;

    @Column(columnDefinition = "TEXT")
    private String commentaire;

    @Column(name = "acteur_id", nullable = false, length = 100)
    private String acteurId;

    @Column(name = "acteur_nom", length = 200)
    private String acteurNom;

    @Column(name = "institution_id")
    private UUID institutionId;

    @Column(name = "institution_nom", length = 200)
    private String institutionNom;

    @Column(name = "date_action", nullable = false)
    private LocalDateTime dateAction;

    @Column(name = "hash", length = 64)
    private String hash;

    @Column(name = "previous_hash", length = 64)
    private String previousHash;

    public String calculateHash(String previousHashVal) {
        String payload = String.format("%s|%s|%s|%s|%s|%s",
            previousHashVal != null ? previousHashVal : "",
            operation != null && operation.getId() != null ? operation.getId().toString() : "",
            statutAvant != null ? statutAvant.name() : "NULL",
            statutApres != null ? statutApres.name() : "",
            acteurId != null ? acteurId : "",
            dateAction != null ? dateAction.toString() : ""
        );
        try {
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            byte[] encodedHash = digest.digest(payload.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : encodedHash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException("Error calculating history hash", e);
        }
    }
}
