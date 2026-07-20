package com.microlinks.institution.config;

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
 * Utilitaire de chiffrement et déchiffrement AES-256-GCM pour sécuriser
 * les colonnes de base de données à chaud (Field-Level Encryption - FLE).
 */
@Component
@Slf4j
public class EncryptionUtils {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_TAG_LENGTH = 128; // bits
    private static final int GCM_IV_LENGTH = 12;   // octets

    private static final String DEFAULT_KEY = "MicroLinksSftp#Key256bits!Secure";
    private static byte[] encryptionKey = Arrays.copyOf(DEFAULT_KEY.getBytes(java.nio.charset.StandardCharsets.UTF_8), 32);

    /**
     * Constructeur pour injection de la clé depuis l'environnement Spring.
     *
     * @param key Clé de chiffrement (32 caractères ASCII = 256 bits).
     */
    public EncryptionUtils(
            @Value("${sftp.encryption.key:" + DEFAULT_KEY + "}") String key) {
        byte[] keyBytes = key.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        encryptionKey = Arrays.copyOf(keyBytes, 32);
        log.info("EncryptionUtils (institution) initialisé avec chiffrement AES-256-GCM");
    }

    /**
     * Constructeur par défaut (requis pour JPA).
     */
    public EncryptionUtils() {
        byte[] keyBytes = DEFAULT_KEY.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        encryptionKey = Arrays.copyOf(keyBytes, 32);
    }

    /**
     * Chiffre une chaîne en AES-256-GCM.
     *
     * @param plainText Texte clair.
     * @return Texte chiffré encodé en Base64 avec IV préfixé.
     */
    public static String encrypt(String plainText) {
        if (plainText == null) {
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

            byte[] encryptedBytes = cipher.doFinal(plainText.getBytes(java.nio.charset.StandardCharsets.UTF_8));

            byte[] combined = new byte[iv.length + encryptedBytes.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(encryptedBytes, 0, combined, iv.length, encryptedBytes.length);

            return Base64.getEncoder().encodeToString(combined);
        } catch (Exception e) {
            log.error("Erreur lors du chiffrement de la donnée", e);
            throw new RuntimeException("Erreur de chiffrement", e);
        }
    }

    /**
     * Déchiffre une chaîne en AES-256-GCM.
     *
     * @param cipherText Texte chiffré encodé en Base64.
     * @return Texte en clair déchiffré.
     */
    public static String decrypt(String cipherText) {
        if (cipherText == null || cipherText.isEmpty()) {
            return null;
        }
        try {
            byte[] combined = Base64.getDecoder().decode(cipherText);

            byte[] iv = Arrays.copyOfRange(combined, 0, GCM_IV_LENGTH);
            byte[] encryptedBytes = Arrays.copyOfRange(combined, GCM_IV_LENGTH, combined.length);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            SecretKeySpec keySpec = new SecretKeySpec(encryptionKey, "AES");
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.DECRYPT_MODE, keySpec, parameterSpec);

            byte[] decryptedBytes = cipher.doFinal(encryptedBytes);
            return new String(decryptedBytes, java.nio.charset.StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.warn("Échec du déchiffrement, retour de la valeur brute: {}", e.getMessage());
            return cipherText;
        }
    }
}
