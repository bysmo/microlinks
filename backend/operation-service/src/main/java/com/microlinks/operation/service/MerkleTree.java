package com.microlinks.operation.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.List;

/**
 * Algorithme de construction et de validation d'un arbre de Merkle
 * pour valider des blocs de transactions (opérations).
 */
public class MerkleTree {

    private final List<String> leaves;
    private final String rootHash;

    /**
     * Construit un arbre de Merkle à partir d'une liste de hashs de transactions.
     *
     * @param txHashes Liste des hashs des transactions (feuilles de l'arbre).
     */
    public MerkleTree(List<String> txHashes) {
        this.leaves = txHashes != null ? txHashes : new ArrayList<>();
        this.rootHash = buildTree(this.leaves);
    }

    /**
     * Récupère le hash racine (Merkle Root) de l'arbre.
     *
     * @return Le hash racine sous forme de chaîne hexadécimale.
     */
    public String getRootHash() {
        return rootHash;
    }

    /**
     * Algorithme récursif de calcul des noeuds pour obtenir la racine.
     */
    private String buildTree(List<String> hashes) {
        if (hashes == null || hashes.isEmpty()) {
            return "";
        }
        if (hashes.size() == 1) {
            return hashes.get(0);
        }

        List<String> currentLevel = new ArrayList<>(hashes);
        while (currentLevel.size() > 1) {
            List<String> nextLevel = new ArrayList<>();
            for (int i = 0; i < currentLevel.size(); i += 2) {
                String left = currentLevel.get(i);
                // Si le nombre d'éléments est impair, le dernier nœud est dupliqué
                String right = (i + 1 < currentLevel.size()) ? currentLevel.get(i + 1) : left;
                nextLevel.add(calculateSha256(left + right));
            }
            currentLevel = nextLevel;
        }
        return currentLevel.get(0);
    }

    /**
     * Calcule le hash SHA-256 d'une chaîne.
     */
    private String calculateSha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException("Erreur de hachage SHA-256", e);
        }
    }
}
