#!/bin/bash
# ==============================================================================
# Script Maître d'Exécution de Tous les Tests MicroLinks (Backend & Frontend)
# ==============================================================================
set -e

# Couleurs pour le terminal
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # Pas de couleur

echo -e "${BLUE}======================================================================${NC}"
echo -e "${BLUE}        LANCEMENT GLOBAL DE LA SUITE DE TESTS MICROLINKS              ${NC}"
echo -e "${BLUE}======================================================================${NC}"

# Répertoire racine du projet
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

# 1. Validation de l'environnement
if [ ! -d "$BACKEND_DIR" ]; then
    echo -e "${RED}Erreur : Répertoire 'backend' introuvable !${NC}"
    exit 1
fi

# 2. Exécution des tests Backend (Maven)
echo -e "\n${YELLOW}[1/2] Lancement des tests unitaires backend (Java)...${NC}"
cd "$BACKEND_DIR"
if mvn clean test -Dspring.classformat.ignore=true; then
    echo -e "${GREEN}✔ Tous les tests unitaires backend (Java) sont validés !${NC}"
else
    echo -e "${RED}❌ Échec de la suite de tests backend.${NC}"
    exit 1
fi

# 3. Exécution des vérifications Frontend (Node/Vite)
if [ -d "$FRONTEND_DIR" ]; then
    echo -e "\n${YELLOW}[2/2] Validation du build frontend (React/Vite)...${NC}"
    cd "$FRONTEND_DIR"
    if npm run build -- --emptyOutDir; then
        echo -e "${GREEN}✔ Compilation et build du frontend validés !${NC}"
    else
        echo -e "${RED}❌ Échec de la compilation frontend.${NC}"
        exit 1
    fi
else
    echo -e "\n${YELLOW}[2/2] Pas de dossier frontend trouvé, étape sautée.${NC}"
fi

echo -e "\n${GREEN}======================================================================${NC}"
echo -e "${GREEN}       SUCCÈS : TOUTES LES VÉRIFICATIONS ET TESTS SONT AU VERT !      ${NC}"
echo -e "${GREEN}======================================================================${NC}"
exit 0
