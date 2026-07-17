package com.microlinks.operation.config;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.extern.slf4j.Slf4j;

/**
 * Convertisseur JPA pour chiffrer et déchiffrer les chaînes de caractères
 * sensibles (noms de clients, numéros de comptes, e-mail, téléphone)
 * à l'aide d'AES-256-GCM.
 */
@Converter
@Slf4j
public class SensitiveStringConverter implements AttributeConverter<String, String> {

    @Override
    public String convertToDatabaseColumn(String attribute) {
        if (attribute == null || attribute.isBlank()) {
            return null;
        }
        try {
            return EncryptionUtils.encrypt(attribute);
        } catch (Exception e) {
            log.error("Échec du chiffrement de la chaîne sensible", e);
            throw new RuntimeException("Erreur de chiffrement de donnée", e);
        }
    }

    @Override
    public String convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return null;
        }
        try {
            return EncryptionUtils.decrypt(dbData);
        } catch (Exception e) {
            log.warn("Échec du déchiffrement, retour de la valeur brute: {}", e.getMessage());
            return dbData;
        }
    }
}
