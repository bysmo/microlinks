---
name: MicroLinks
description: Poste de contrôle des opérations inter-institutions de microfinance et banques
colors:
  chrome-navy: "#0B192C"
  signal-yellow: "#F3C623"
  signal-yellow-deep: "#e0b512"
  success: "#16a34a"
  success-deep: "#15803d"
  danger: "#dc2626"
  danger-deep: "#b91c1c"
  info: "#1d4ed8"
  surface: "#ffffff"
  canvas: "#f8fafc"
  ink: "#0f172a"
  ink-muted: "#334155"
  border-neutral: "#e2e8f0"
typography:
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "normal"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.05em"
  mono:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.01em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.signal-yellow}"
    textColor: "{colors.chrome-navy}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.signal-yellow-deep}"
    textColor: "{colors.chrome-navy}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-secondary:
    backgroundColor: "{colors.chrome-navy}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  badge:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.lg}"
    padding: "24px"
---

# Design System: MicroLinks

## 1. Overview

**Creative North Star: "Le Poste de Contrôle"**

MicroLinks se pense comme le poste de contrôle d'une salle des opérations financières : un cadre marine et jaune, autoritaire et stable, qui encadre un canevas de travail clair et sans bruit. La barre latérale, les entêtes de tableau et le pied de page de tableau restent dans ce chrome sombre — c'est là que vit l'identité de la plateforme. Le canevas de contenu (cartes, formulaires, tableaux) reste volontairement clair et plat : c'est l'espace où l'agent lit des montants, valide des opérations et ne doit jamais être distrait par la décoration.

Ce système rejette explicitement l'esthétique « SaaS coloré » : pas de dégradés décoratifs, pas de glassmorphism généralisé, pas de cartes empilées identiques. La confiance se lit dans la rigueur — hiérarchie stricte, statuts toujours visibles, aucun raccourci esthétique qui masquerait une donnée financière.

**Key Characteristics:**
- Chrome marine + jaune réservé à la navigation et aux actions primaires ; jamais au canevas de contenu.
- Canevas clair et plat par défaut (slate-50 / blanc), sans glassmorphism.
- Boutons et champs fermes, sans ambiguïté : angles nets, états toujours distincts.
- Vocabulaire de statut riche et cohérent (badges pastille) pour porter la traçabilité à l'œil.
- Élévation réservée aux éléments qui flottent au-dessus du flux (dropdown, modale, toast).

## 2. Colors

Une palette à deux registres : un chrome marine/jaune identitaire, et un canevas neutre clair où vivent les données.

### Primary
- **Jaune Signal** (#F3C623): action primaire, élément actif de la navigation, accent d'identité (logo, entêtes de tableau, indicateurs). Utilisé avec parcimonie sur le canevas — jamais en fond de page.
- **Jaune Signal Profond** (#e0b512): état hover du bouton primaire.

### Secondary
- **Marine Chrome** (#0B192C): couleur du cadre — barre latérale, entête et pied de tableau, bouton secondaire, anneau de focus. C'est la couleur d'autorité de la plateforme, jamais utilisée sur le canevas de contenu.

### Tertiary
- **Succès** (#16a34a / hover #15803d): confirmation, statut « comptabilisé », « actif », « payée ».
- **Danger** (#dc2626 / hover #b91c1c): rejet, suspension, retard, actions destructrices.
- **Info** (#1d4ed8): statut « soumis », informations neutres en attente de traitement.

### Neutral
- **Surface** (#ffffff): fond des cartes, tableaux, modales.
- **Canevas** (#f8fafc): fond de page, pied de tableau clair, survol léger de ligne.
- **Encre** (#0f172a): texte principal, titres, valeurs de tableau.
- **Encre Atténuée** (#334155): texte secondaire, corps de modale.
- **Bordure Neutre** (#e2e8f0): séparateurs de carte, de tableau, de champ.

### Named Rules
**La Règle Chrome vs Canevas.** Le marine et le jaune n'habillent que le cadre (sidebar, entêtes/pied de tableau, boutons primaires/secondaires) et les statuts. Le canevas de contenu — cartes, corps de tableau, modales — reste sur la palette neutre claire. Ne jamais étendre le marine ou le jaune en fond de carte ou de page.

## 3. Typography

**Display/Body Font:** Inter (avec system-ui, sans-serif)
**Mono Font:** JetBrains Mono (avec monospace) — réservé aux valeurs chronométrées/numériques denses (ex. compte à rebours du scan d'intégrité).

**Character:** Une seule famille sans-serif porte toute la hiérarchie — titres, corps, libellés, données de tableau. Le mono n'apparaît que pour signaler une valeur technique ou temporelle, jamais pour du texte courant.

### Hierarchy
- **Title** (700, 1.125rem/18px, line-height 1.2): titres de page dans l'entête, titres de modale.
- **Body** (400, 0.875rem/14px, line-height 1.5): texte courant, cellules de tableau, corps de modale.
- **Label** (600, 0.75rem/12px, letter-spacing 0.05em, souvent uppercase): entêtes de colonnes de tableau, libellés de formulaire.
- **Mono** (700, 0.75rem/12px, letter-spacing -0.01em): compte à rebours de sécurité, identifiants techniques courts.

### Named Rules
**La Règle Une Seule Voix.** Une seule famille sans-serif (Inter) pour toute l'interface. Le mono est une exception ponctuelle réservée aux données chronométrées ou techniques, jamais une deuxième voix généralisée.

## 4. Elevation

Plat par défaut, élévation réservée aux overlays. Cartes, tableaux et barre latérale reposent sur une bordure fine (1px, `border-neutral`) sans ombre portée. L'ombre n'apparaît que pour signaler qu'un élément flotte au-dessus du flux normal de lecture : menu de notifications, modale, toast. Une classe `.glass-card` existe dans le code mais elle est neutralisée par les surcharges de thème clair dans le canevas de contenu — elle ne doit pas être réactivée comme signature visuelle du produit.

### Shadow Vocabulary
- **Carte au repos** (`border: 1px solid #e2e8f0`, pas d'ombre): cartes de statistiques, conteneur de tableau.
- **Carte interactive** (`box-shadow: 0 1px 3px rgba(0,0,0,0.05)` au repos, `0 10px 15px -3px rgba(0,0,0,0.05)` au survol): cartes cliquables uniquement.
- **Overlay flottant** (`box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1)`): menu déroulant de notifications.
- **Modale** (`box-shadow` 2xl, fond assombri `rgba(15,23,42,0.6)` avec `backdrop-filter: blur(4px)`): fenêtres de saisie/validation.

### Named Rules
**La Règle Plat-par-Défaut.** Une surface est plate au repos. L'ombre n'apparaît qu'en réponse à un état (survol d'une carte cliquable) ou à une superposition réelle (dropdown, modale, toast) — jamais en décoration statique.

## 5. Components

### Buttons
- **Shape:** angles nets, rayon moyen (8px, `rounded-lg`).
- **Primary:** fond Jaune Signal (#F3C623), texte Marine Chrome (#0B192C), padding 8px 16px, poids 600.
- **Hover / Focus:** le primaire fonce vers #e0b512 avec une ombre douce ; le focus utilise un anneau marine à 15% d'opacité, jamais de contour par défaut du navigateur.
- **Secondary:** fond Marine Chrome, texte blanc — réservé aux actions de second plan dans le cadre, pas sur le canevas neutre.
- **Danger / Success:** fonds pleins rouge/vert avec variante hover plus sombre, texte blanc.
- **Ghost:** transparent, texte slate, fond slate-100 au survol — pour les actions tertiaires (fermer, annuler).

### Badges (statuts)
- **Style:** pastille arrondie complète (`rounded-full`), fond pastel + texte + bordure de la même teinte (ex. `bg-emerald-50 text-emerald-700 border-emerald-200`).
- **Vocabulaire:** une couleur par famille de statut — ambre/slate pour brouillon, bleu pour soumis, émeraude pour accepté/actif/payé, rouge pour rejeté/suspendu/en retard, slate clair pour annulé. Ce vocabulaire est fixe et ne doit pas varier d'un écran à l'autre.

### Cards / Containers
- **Corner Style:** 12px (`rounded-xl`) pour les cartes et le conteneur de tableau ; 16px (`rounded-2xl`) pour les modales.
- **Background:** blanc (#ffffff) sur fond canevas (#f8fafc).
- **Shadow Strategy:** voir Élévation — plat au repos, ombre douce seulement si la carte est cliquable.
- **Border:** 1px `border-neutral` (#e2e8f0) systématique.
- **Internal Padding:** 24px pour les cartes de contenu, 16px pour les cellules de tableau.

### Inputs / Fields
- **Style:** fond blanc, bordure slate-300, rayon 8px, padding 10px 16px.
- **Focus:** bordure Marine Chrome + anneau `box-shadow` marine à 15% d'opacité, sans changement de fond.
- **Error / Disabled:** message d'erreur en rouge 12px sous le champ ; désactivé en opacité réduite avec curseur bloqué.

### Navigation
- **Sidebar:** fond Marine Chrome plein, items en texte slate clair, item actif en fond Jaune Signal avec texte marine et poids 700. Rétractable (16px collapsed / 64px expanded), icônes toujours visibles.
- **Top bar:** fond blanc, séparé du canevas par une bordure fine, sticky en haut de viewport. Porte le titre de page, l'indicateur de sécurité (mono), les notifications et le profil.

### Data Table (composant signature)
Entête et pied en Marine Chrome avec libellés Jaune Signal (majuscules, letter-spacing large) ; corps en blanc avec lignes séparées par une bordure fine et un survol canevas clair. Pagination intégrée au pied sombre, avec la page active en Jaune Signal plein.

## 6. Do's and Don'ts

### Do:
- **Do** réserver le Marine Chrome et le Jaune Signal au cadre (sidebar, entêtes/pied de tableau, boutons primaires/secondaires) et aux statuts — jamais en fond de carte ou de page.
- **Do** garder les cartes et tableaux plats au repos (bordure 1px, pas d'ombre) ; n'introduire une ombre que pour un élément réellement flottant (dropdown, modale, toast).
- **Do** utiliser le vocabulaire de badges fixe (pastille + teinte pastel) pour chaque famille de statut, de manière identique sur tous les écrans.
- **Do** garder les boutons et champs fermes et sans ambiguïté : angles nets à 8px, états hover/focus/disabled toujours visuellement distincts.
- **Do** limiter le mono (JetBrains Mono) aux valeurs chronométrées ou techniques ponctuelles.

### Don't:
- **Don't** réactiver `.glass-card` ou le glassmorphism comme signature visuelle générale — il a été neutralisé volontairement dans le canevas clair.
- **Don't** utiliser de dégradés décoratifs (`background-clip: text`, boutons en dégradé) ou de bordures colorées en `border-left`/`border-right` comme accent.
- **Don't** empiler des grilles de cartes identiques (icône + titre + texte) répétées sans raison fonctionnelle.
- **Don't** étendre le Marine ou le Jaune au fond du canevas de contenu — ils identifient le cadre, pas les données.
- **Don't** introduire une deuxième famille de police pour l'esthétique ; Inter porte toute la hiérarchie, le mono reste l'exception technique.
