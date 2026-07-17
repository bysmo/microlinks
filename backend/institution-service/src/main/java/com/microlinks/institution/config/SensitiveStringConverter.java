package com.microlinks.institution.config;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.extern.slf4j.Slf4j;

/**
 * Convertisseur JPA AES-256-GCM pour chiffrer les données SFTP sensibles
 * (mot de passe, clé privée SSH) avant stockage en base de données.
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
            log.error("Erreur lors du chiffrement de la donnée sensible", e);
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
            log.error("Erreur lors du déchiffrement de la donnée sensible", e);
            throw new RuntimeException("Erreur de déchiffrement de donnée", e);
        }
    }
}
