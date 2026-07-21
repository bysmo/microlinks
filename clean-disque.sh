#!/bin/bash

# Script de nettoyage des fichiers temporaires et métadonnées macOS (AppleDouble)
# pour résoudre les erreurs de compilation Docker sur disque externe.

echo "=== Début du nettoyage du projet microlinks ==="

# 1. Retrait des drapeaux de verrouillage (uchg/schg) qui empêchent la suppression
echo "1. Déverrouillage des fichiers en cours..."
chflags -R nouchg . 2>/dev/null

# 2. Utilisation de dot_clean pour fusionner/nettoyer les fichiers AppleDouble
echo "2. Nettoyage avec dot_clean..."
dot_clean -m . 2>/dev/null

# 3. Suppression récursive des fichiers ._* restants (hors .git)
echo "3. Suppression des fichiers ._* restants..."
find . -name "._*" -not -path "./.git/*" -delete 2>/dev/null

# 4. Suppression des fichiers .DS_Store (facultatif mais recommandé pour Docker)
echo "4. Suppression des fichiers .DS_Store..."
find . -name ".DS_Store" -not -path "./.git/*" -delete 2>/dev/null

echo "=== Nettoyage terminé ! ==="
echo "Vous pouvez maintenant relancer la compilation de vos microservices."
