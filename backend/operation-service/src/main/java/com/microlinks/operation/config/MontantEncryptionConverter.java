package com.microlinks.operation.config;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.extern.slf4j.Slf4j;
import java.math.BigDecimal;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.SecretKeySpec;

@Converter
@Slf4j
public class MontantEncryptionConverter implements AttributeConverter<BigDecimal, String> {

    private static final String ALGORITHM = "AES";
    private static final byte[] KEY = "MicroLinksSec#26".getBytes();

    @Override
    public String convertToDatabaseColumn(BigDecimal attribute) {
        if (attribute == null) {
            return null;
        }
        try {
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            SecretKeySpec secretKeySpec = new SecretKeySpec(KEY, ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, secretKeySpec);
            byte[] encryptedBytes = cipher.doFinal(attribute.toPlainString().getBytes());
            return Base64.getEncoder().encodeToString(encryptedBytes);
        } catch (Exception e) {
            log.error("Failed to encrypt amount value", e);
            throw new RuntimeException("Error encrypting amount", e);
        }
    }

    @Override
    public BigDecimal convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isEmpty()) {
            return null;
        }
        try {
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            SecretKeySpec secretKeySpec = new SecretKeySpec(KEY, ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, secretKeySpec);
            byte[] decryptedBytes = cipher.doFinal(Base64.getDecoder().decode(dbData));
            return new BigDecimal(new String(decryptedBytes));
        } catch (Exception e) {
            // Fallback: If it's not base64 or not encrypted, try parsing it directly as a number
            try {
                return new BigDecimal(dbData);
            } catch (NumberFormatException nfe) {
                log.error("Failed to decrypt or parse decimal value: " + dbData, e);
                throw new RuntimeException("Error decrypting amount", e);
            }
        }
    }
}
