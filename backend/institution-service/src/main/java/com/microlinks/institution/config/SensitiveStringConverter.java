package com.microlinks.institution.config;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;

/**
 * Convertisseur JPA AES-256/GCM pour chiffrer les données SFTP sensibles
 * (mot de passe, clé privée SSH) avant stockage en base de données.
 *
 * La clé de chiffrement est lue depuis la propriété d'environnement
 * {@code sftp.encryption.key} (32 caractères ASCII = 256 bits).
 * En développement, une clé par défaut est utilisée.
 */
@Converter
@Component
@Slf4j
public class SensitiveStringConverter implements AttributeConverter<String, String> {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_TAG_LENGTH = 128; // bits
    private static final int GCM_IV_LENGTH = 12;   // bytes

    // Clé de 32 bytes (256 bits) — à surcharger en production via variable d'env
    private static final String DEFAULT_KEY = "MicroLinksSftp#Key256bits!Secure";

    private static byte[] encryptionKey;

    /**
     * Injection de la clé depuis les propriétés Spring.
     * Appelé par Spring au démarrage via le constructeur de composant.
     */
    public SensitiveStringConverter(
            @Value("${sftp.encryption.key:" + DEFAULT_KEY + "}") String key) {
        byte[] keyBytes = key.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        // Tronquer ou padder à 32 bytes
        encryptionKey = Arrays.copyOf(keyBytes, 32);
        log.info("SensitiveStringConverter initialisé avec chiffrement AES-256/GCM");
    }

    /**
     * Constructeur par défaut requis par JPA (instanciation sans Spring).
     */
    public SensitiveStringConverter() {
        byte[] keyBytes = DEFAULT_KEY.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        encryptionKey = Arrays.copyOf(keyBytes, 32);
    }

    @Override
    public String convertToDatabaseColumn(String attribute) {
        if (attribute == null || attribute.isBlank()) {
            return null;
        }
        try {
            SecureRandom secureRandom = new SecureRandom();
            byte[] iv = new byte[GCM_IV_LENGTH];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            SecretKeySpec keySpec = new SecretKeySpec(encryptionKey, "AES");
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.ENCRYPT_MODE, keySpec, parameterSpec);

            byte[] encryptedData = cipher.doFinal(
                    attribute.getBytes(java.nio.charset.StandardCharsets.UTF_8));

            // Préfixer le IV chiffré pour le déchiffrement : IV(12) + données
            byte[] combined = new byte[iv.length + encryptedData.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(encryptedData, 0, combined, iv.length, encryptedData.length);

            return Base64.getEncoder().encodeToString(combined);
        } catch (Exception e) {
            log.error("Erreur lors du chiffrement de la donnée sensible", e);
            throw new RuntimeException("Erreur de chiffrement SFTP", e);
        }
    }

    @Override
    public String convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return null;
        }
        try {
            byte[] combined = Base64.getDecoder().decode(dbData);

            byte[] iv = Arrays.copyOfRange(combined, 0, GCM_IV_LENGTH);
            byte[] encryptedData = Arrays.copyOfRange(combined, GCM_IV_LENGTH, combined.length);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            SecretKeySpec keySpec = new SecretKeySpec(encryptionKey, "AES");
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.DECRYPT_MODE, keySpec, parameterSpec);

            byte[] decryptedData = cipher.doFinal(encryptedData);
            return new String(decryptedData, java.nio.charset.StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.error("Erreur lors du déchiffrement de la donnée sensible", e);
            throw new RuntimeException("Erreur de déchiffrement SFTP", e);
        }
    }
}
