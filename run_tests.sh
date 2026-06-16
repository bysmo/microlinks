#!/bin/bash
# ==============================================================================
# Script de lancement de la batterie de tests MicroLinks
# ==============================================================================
set -e

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================================================${NC}"
echo -e "${BLUE}       DÉMARRAGE DE LA BATTERIE DE TESTS MICROLINKS (BACKEND)         ${NC}"
echo -e "${BLUE}======================================================================${NC}"

# Dossier des microservices
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"

if [ ! -d "$BACKEND_DIR" ]; then
    echo -e "${YELLOW}Erreur : Le dossier 'backend' est introuvable.${NC}"
    exit 1
fi

echo -e "\n${YELLOW}Exécution des tests Maven multi-modules...${NC}"
cd "$BACKEND_DIR"

# Lancement des tests avec Maven
# clean : nettoie les builds précédents
# test : compile et lance les tests unitaires et d'intégration
mvn clean test

echo -e "\n${GREEN}======================================================================${NC}"
echo -e "${GREEN}      TOUS LES TESTS DU BACKEND ONT ÉTÉ EXÉCUTÉS AVEC SUCCÈS !        ${NC}"
echo -e "${GREEN}======================================================================${NC}"
