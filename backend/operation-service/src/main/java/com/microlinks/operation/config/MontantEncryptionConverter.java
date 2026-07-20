package com.microlinks.operation.config;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.extern.slf4j.Slf4j;
import java.math.BigDecimal;

/**
 * Convertisseur JPA pour chiffrer et déchiffrer les montants (BigDecimal)
 * en base de données à l'aide d'AES-256-GCM.
 */
@Converter
@Slf4j
public class MontantEncryptionConverter implements AttributeConverter<BigDecimal, String> {

    @Override
    public String convertToDatabaseColumn(BigDecimal attribute) {
        if (attribute == null) {
            return null;
        }
        try {
            return EncryptionUtils.encrypt(attribute.toPlainString());
        } catch (Exception e) {
            log.error("Échec du chiffrement du montant", e);
            throw new RuntimeException("Erreur de chiffrement du montant", e);
        }
    }

    @Override
    public BigDecimal convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isEmpty()) {
            return null;
        }
        try {
            String decrypted = EncryptionUtils.decrypt(dbData);
            return new BigDecimal(decrypted);
        } catch (Exception e) {
            // Fallback en cas d'ancienne valeur non chiffrée ou parse direct
            try {
                return new BigDecimal(dbData);
            } catch (NumberFormatException nfe) {
                log.error("Échec critique du déchiffrement ou du parsing décimal pour: " + dbData, nfe);
                // Retourner BigDecimal.ZERO pour éviter de faire planter l'affichage complet de la liste des opérations
                return BigDecimal.ZERO;
            }
        }
    }
}
