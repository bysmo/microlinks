package com.microlinks.operation.service;

import com.microlinks.operation.config.EncryptionUtils;
import com.microlinks.operation.entity.Operation;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests unitaires vérifiant le chiffrement AES-256-GCM, le chaînage blockchain
 * des transactions et l'arbre de Merkle.
 */
public class BlockchainAndEncryptionTest {

    @BeforeEach
    public void setup() {
        // Initialiser EncryptionUtils avec la clé par défaut
        new EncryptionUtils();
    }

    @Test
    public void testEncryptionAndDecryption() {
        String plainText = "CompteSecret12345";
        String cipherText = EncryptionUtils.encrypt(plainText);
        
        assertNotNull(cipherText);
        assertNotEquals(plainText, cipherText);

        String decrypted = EncryptionUtils.decrypt(cipherText);
        assertEquals(plainText, decrypted);
    }

    @Test
    public void testDecryptionFallback() {
        // Si le texte n'est pas chiffré, il doit retourner la valeur brute
        String plainText = "TexteEnClairSansChiffrement";
        String decrypted = EncryptionUtils.decrypt(plainText);
        assertEquals(plainText, decrypted);
    }

    @Test
    public void testBlockchainChaining() {
        UUID tenantId = UUID.randomUUID();
        LocalDateTime now = LocalDateTime.now();

        // Transaction 1 (initiale)
        Operation op1 = Operation.builder()
                .id(UUID.randomUUID())
                .tenantId(tenantId)
                .montant(new BigDecimal("1000.00"))
                .createdAt(now)
                .build();
        String genesisPrevHash = "0000000000000000000000000000000000000000000000000000000000000000";
        op1.setPreviousHash(genesisPrevHash);
        op1.setHash(op1.calculateHash(genesisPrevHash));

        assertNotNull(op1.getHash());
        assertEquals(64, op1.getHash().length());

        // Transaction 2 (liée à 1)
        Operation op2 = Operation.builder()
                .id(UUID.randomUUID())
                .tenantId(tenantId)
                .montant(new BigDecimal("500.50"))
                .createdAt(now.plusMinutes(1))
                .build();
        op2.setPreviousHash(op1.getHash());
        op2.setHash(op2.calculateHash(op1.getHash()));

        assertEquals(op1.getHash(), op2.getPreviousHash());
        assertNotEquals(op1.getHash(), op2.getHash());
        assertEquals(64, op2.getHash().length());
    }

    @Test
    public void testMerkleTreeRoot() {
        List<String> hashes = List.of(
            "hash1_placeholder",
            "hash2_placeholder",
            "hash3_placeholder"
        );

        MerkleTree tree = new MerkleTree(hashes);
        String rootHash = tree.getRootHash();

        assertNotNull(rootHash);
        assertFalse(rootHash.isEmpty());
        assertEquals(64, rootHash.length());
    }
}
