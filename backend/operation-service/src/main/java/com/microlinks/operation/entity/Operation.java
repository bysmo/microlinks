package com.microlinks.operation.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.FilterDef;
import org.hibernate.annotations.ParamDef;
import com.microlinks.operation.config.SensitiveStringConverter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Représente un enregistrement de transaction financière (Opération).
 * Sécurisé par chiffrement au niveau des champs (FLE) et chaînage par
 * blockchain.
 */
@Entity
@Table(name = "operations", indexes = {
        @Index(name = "idx_op_reference", columnList = "reference_unique"),
        @Index(name = "idx_op_statut", columnList = "statut"),
        @Index(name = "idx_op_institution_emettrice", columnList = "institution_emettrice_id"),
        @Index(name = "idx_op_institution_beneficiaire", columnList = "institution_beneficiaire_id"),
        @Index(name = "idx_op_date_operation", columnList = "date_operation"),
        @Index(name = "idx_op_tenant", columnList = "tenant_id")
})
@FilterDef(name = "tenantFilter", parameters = @ParamDef(name = "tenantId", type = String.class))
@Filter(name = "tenantFilter", condition = "tenant_id = cast(:tenantId as uuid) OR institution_emettrice_id = cast(:tenantId as uuid) OR institution_beneficiaire_id = cast(:tenantId as uuid) OR banque_correspondante_emettrice_id = cast(:tenantId as uuid) OR banque_correspondante_receptrice_id = cast(:tenantId as uuid)")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Operation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "tenant_id")
    private UUID tenantId;

    @Column(name = "reference_unique", nullable = false, unique = true, length = 50)
    private String referenceUnique;

    @Enumerated(EnumType.STRING)
    @Column(name = "type_operation", nullable = false, length = 20)
    private TypeOperation typeOperation;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private StatutOperation statut;

    @Column(name = "date_operation", nullable = false)
    private LocalDate dateOperation;

    @Column(name = "date_valeur")
    private LocalDate dateValeur;

    @Convert(converter = com.microlinks.operation.config.MontantEncryptionConverter.class)
    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal montant;

    @Column(name = "checksum", length = 64)
    private String checksum;

    @Column(name = "previous_hash", length = 64)
    private String previousHash;

    @Column(name = "hash", length = 64)
    private String hash;

    @Column(nullable = false, length = 10)
    private String devise;

    @Column(columnDefinition = "TEXT")
    private String motif;

    // =================== DONNEUR D'ORDRE ===================

    @Column(name = "institution_emettrice_id", nullable = false)
    private UUID institutionEmettriceId;

    @Column(name = "nom_institution_emettrice", nullable = false, length = 200)
    private String nomInstitutionEmettrice;

    @Convert(converter = SensitiveStringConverter.class)
    @Column(name = "compte_donneur_ordre", nullable = false, length = 255)
    private String compteDonneurOrdre;

    @Convert(converter = SensitiveStringConverter.class)
    @Column(name = "nom_donneur_ordre", nullable = false, length = 255)
    private String nomDonneurOrdre;

    @Column(name = "banque_correspondante_emettrice_id")
    private UUID banqueCorrespondanteEmettriceId;

    @Column(name = "nom_banque_correspondante_emettrice", length = 200)
    private String nomBanqueCorrespondanteEmettrice;

    @Convert(converter = SensitiveStringConverter.class)
    @Column(name = "compte_correspondance_emetteur", length = 255)
    private String compteCorrespondanceEmetteur;

    // =================== BÉNÉFICIAIRE ===================

    @Column(name = "institution_beneficiaire_id", nullable = false)
    private UUID institutionBeneficiaireId;

    @Column(name = "nom_institution_beneficiaire", nullable = false, length = 200)
    private String nomInstitutionBeneficiaire;

    @Convert(converter = SensitiveStringConverter.class)
    @Column(name = "compte_beneficiaire", nullable = false, length = 255)
    private String compteBeneficiaire;

    @Convert(converter = SensitiveStringConverter.class)
    @Column(name = "nom_beneficiaire", nullable = false, length = 255)
    private String nomBeneficiaire;

    @Column(name = "banque_correspondante_receptrice_id")
    private UUID banqueCorrespondanteReceptriceId;

    @Column(name = "nom_banque_correspondante_receptrice", length = 200)
    private String nomBanqueCorrespondanteReceptrice;

    @Convert(converter = SensitiveStringConverter.class)
    @Column(name = "compte_correspondance_recepteur", length = 255)
    private String compteCorrespondanceRecepteur;

    // =================== INFOS CHÈQUE ===================

    @Convert(converter = SensitiveStringConverter.class)
    @Column(name = "numero_cheque", length = 255)
    private String numeroCheque;

    // =================== TRAÇABILITÉ ===================

    @OneToMany(mappedBy = "operation", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @OrderBy("dateAction ASC")
    private List<HistoriqueStatut> historique;

    @Column(name = "cree_par", nullable = false, length = 100)
    private String creePar;

    @Column(name = "institution_createur_id", nullable = false)
    private UUID institutionCreateurId;

    @Column(name = "commentaire_rejet", columnDefinition = "TEXT")
    private String commentaireRejet;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    /**
     * Calcule le checksum de l'opération pour vérifier sa cohérence interne.
     *
     * @return L'empreinte SHA-256 calculée.
     */
    public String calculateChecksum() {
        String payload = String.format("%s|%s|%s|%s|%s",
                compteDonneurOrdre != null ? compteDonneurOrdre : "",
                compteBeneficiaire != null ? compteBeneficiaire : "",
                dateOperation != null ? dateOperation.toString() : "",
                montant != null ? montant.toPlainString() : "0.00",
                statut != null ? statut.name() : "");
        try {
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(payload.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hashBytes) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1)
                    hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException("Erreur de calcul du checksum", e);
        }
    }

    /**
     * Calcule le hash cryptographique de la blockchain reliant cette opération à la
     * précédente.
     * Combinaison : id + tenant_id + amount + timestamp + previous_hash.
     *
     * @param previousHashVal Le hash de la transaction précédente.
     * @return L'empreinte SHA-256 de cette transaction dans la chaîne.
     */
    public String calculateHash(String previousHashVal) {
        String payload = String.format("%s|%s|%s|%s|%s",
                id != null ? id.toString() : "",
                tenantId != null ? tenantId.toString() : "",
                montant != null ? montant.toPlainString() : "0.00",
                createdAt != null ? createdAt.toString() : "",
                previousHashVal != null ? previousHashVal : "");
        try {
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(payload.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hashBytes) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1)
                    hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException("Erreur de calcul du hash de transaction", e);
        }
    }

    @PrePersist
    public void prePersist() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        this.checksum = calculateChecksum();
    }

    @PreUpdate
    public void preUpdate() {
        this.checksum = calculateChecksum();
    }
}
