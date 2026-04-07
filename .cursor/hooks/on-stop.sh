#!/bin/bash
# .cursor/hooks/on-stop.sh
# Déclenché quand l'agent Cursor a terminé sa tâche.
# 1. Applique les corrections Niveau 1 (mécaniques, sans ambiguïté)
# 2. Génère / met à jour REFACTOR_SUGGESTIONS.md pour le Niveau 2

INPUT=$(cat)
WORKSPACE=$(echo "$INPUT" | jq -r '.workspace_roots[0] // empty' 2>/dev/null || echo ".")
cd "$WORKSPACE" 2>/dev/null || exit 0

DATE=$(date '+%Y-%m-%d %H:%M')
SUGGESTIONS_FILE="REFACTOR_SUGGESTIONS.md"
ACTIONS_LOG=""
SUGGESTIONS_LOG=""

# Récupère les fichiers modifiés depuis le dernier commit Git
if command -v git &>/dev/null && git rev-parse --git-dir &>/dev/null 2>&1; then
  CHANGED_FILES=$(git diff --name-only 2>/dev/null)
  NEW_FILES=$(git ls-files --others --exclude-standard 2>/dev/null)
  ALL_FILES=$(printf "%s\n%s" "$CHANGED_FILES" "$NEW_FILES" | sort -u | grep -v '^$')
else
  # Fallback : tous les fichiers source du projet
  ALL_FILES=$(find . -type f \( -name "*.ts" -o -name "*.js" -o -name "*.rs" -o -name "*.html" -o -name "*.css" \) \
    ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/target/*" ! -path "*/dist/*" \
    ! -name "*.test.*" ! -name "*.spec.*" 2>/dev/null)
fi

if [ -z "$ALL_FILES" ]; then
  echo "ℹ️  Aucun fichier modifié détecté — rien à analyser."
  exit 0
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 Refactoring automatique en cours..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ─────────────────────────────────────────────
# NIVEAU 1 — Actions automatiques
# ─────────────────────────────────────────────

while IFS= read -r FILE; do
  [ -f "$FILE" ] || continue
  EXT="${FILE##*.}"
  BASENAME=$(basename "$FILE")

  # Ignore les fichiers de test
  [[ "$FILE" == *".test."* || "$FILE" == *".spec."* || "$FILE" == *"_test.rs" ]] && continue
  # Ignore node_modules, target, dist
  [[ "$FILE" == *"node_modules"* || "$FILE" == *"/target/"* || "$FILE" == *"/dist/"* ]] && continue

  # --- TypeScript / JavaScript ---
  if [[ "$EXT" == "ts" || "$EXT" == "js" || "$EXT" == "tsx" || "$EXT" == "jsx" ]]; then

    # Supprime console.log et console.debug
    COUNT_LOG=$(grep -c 'console\.log(' "$FILE" 2>/dev/null || echo 0)
    COUNT_DEBUG=$(grep -c 'console\.debug(' "$FILE" 2>/dev/null || echo 0)
    TOTAL_CONSOLE=$((COUNT_LOG + COUNT_DEBUG))
    if [ "$TOTAL_CONSOLE" -gt 0 ]; then
      sed -i '/console\.log(/d;/console\.debug(/d' "$FILE"
      ACTIONS_LOG="${ACTIONS_LOG}\n- \`$FILE\` : supprimé $TOTAL_CONSOLE \`console.log/debug\`"
      echo "  ✅ $FILE — $TOTAL_CONSOLE console.log/debug supprimés"
    fi

    # Remplace var par const/let (approche conservative : var → let, l'agent affinera)
    COUNT_VAR=$(grep -c '^\s*var ' "$FILE" 2>/dev/null || echo 0)
    if [ "$COUNT_VAR" -gt 0 ]; then
      sed -i 's/^\(\s*\)var /\1let /g' "$FILE"
      ACTIONS_LOG="${ACTIONS_LOG}\n- \`$FILE\` : remplacé $COUNT_VAR \`var\` → \`let\` (à affiner en \`const\` si applicable)"
      echo "  ✅ $FILE — $COUNT_VAR var → let"
    fi

    # Détecte HTML inline dans un .ts — FLAG uniquement, pas de modification
    if [[ "$EXT" == "ts" || "$EXT" == "js" ]]; then
      HTML_LINES=$(grep -n '`\|<div\|<span\|<form\|<input\|<p>\|<button\|<table\|<ul\|<li' "$FILE" 2>/dev/null | \
        grep -v '^\s*//' | wc -l || echo 0)
      if [ "$HTML_LINES" -gt 3 ]; then
        LINE_NUM=$(grep -n '<div\|<span\|<form\|<input\|<p>\|<button' "$FILE" 2>/dev/null | head -1 | cut -d: -f1)
        SUGGESTIONS_LOG="${SUGGESTIONS_LOG}\n### \`$FILE:${LINE_NUM:-?}\` — HTML inline dans un fichier TypeScript\n**Problème** : Blocs HTML détectés dans un fichier \`.ts\` (${HTML_LINES} lignes concernées)\n**Suggestion** : Extraire le HTML dans un fichier \`.html\` dédié et le charger via fetch ou import\n**Pourquoi** : Mélange de responsabilités — séparer le markup du code TypeScript améliore la maintenabilité\n\n"
        echo "  🔴 $FILE — HTML inline détecté (${HTML_LINES} lignes) → suggestion ajoutée"
      fi
    fi
  fi

  # --- Rust ---
  if [[ "$EXT" == "rs" ]]; then
    # Supprime #[allow(unused)] sans commentaire
    COUNT_ALLOW=$(grep -c '#\[allow(unused)\]' "$FILE" 2>/dev/null || echo 0)
    if [ "$COUNT_ALLOW" -gt 0 ]; then
      sed -i '/#\[allow(unused)\]/d' "$FILE"
      ACTIONS_LOG="${ACTIONS_LOG}\n- \`$FILE\` : supprimé $COUNT_ALLOW \`#[allow(unused)]\`"
      echo "  ✅ $FILE — $COUNT_ALLOW #[allow(unused)] supprimés"
    fi

    # Détecte unwrap() hors tests → suggestion
    UNWRAP_COUNT=$(grep -c '\.unwrap()' "$FILE" 2>/dev/null || echo 0)
    if [ "$UNWRAP_COUNT" -gt 0 ]; then
      LINE_NUM=$(grep -n '\.unwrap()' "$FILE" 2>/dev/null | head -1 | cut -d: -f1)
      SUGGESTIONS_LOG="${SUGGESTIONS_LOG}\n### \`$FILE:${LINE_NUM:-?}\` — \`unwrap()\` en dehors des tests\n**Problème** : $UNWRAP_COUNT appel(s) à \`.unwrap()\` détecté(s)\n**Suggestion** : Remplacer par \`?\` ou une gestion d'erreur explicite avec \`match\` ou \`if let\`\n**Pourquoi** : \`.unwrap()\` provoque un panic en production si la valeur est \`None\` ou \`Err\`\n\n"
      echo "  🟡 $FILE — $UNWRAP_COUNT unwrap() → suggestion ajoutée"
    fi

    # Fichier trop long → suggestion
    LINE_COUNT=$(wc -l < "$FILE" 2>/dev/null || echo 0)
    if [ "$LINE_COUNT" -gt 400 ]; then
      SUGGESTIONS_LOG="${SUGGESTIONS_LOG}\n### \`$FILE\` — Fichier trop long ($LINE_COUNT lignes)\n**Problème** : Le fichier dépasse 400 lignes\n**Suggestion** : Envisager de découper en sous-modules dans un dossier \`$(dirname "$FILE")/$(basename "$FILE" .rs)/\`\n**Pourquoi** : Facilite la navigation, les tests unitaires et la relecture\n\n"
      echo "  🟡 $FILE — $LINE_COUNT lignes → suggestion de découpage"
    fi
  fi

  # --- HTML ---
  if [[ "$EXT" == "html" ]]; then
    # Supprime les commentaires vides
    sed -i 's/<!--\s*-->//g' "$FILE"

    # Détecte script inline → suggestion
    SCRIPT_INLINE=$(grep -c '<script>' "$FILE" 2>/dev/null || echo 0)
    if [ "$SCRIPT_INLINE" -gt 0 ]; then
      LINE_NUM=$(grep -n '<script>' "$FILE" 2>/dev/null | head -1 | cut -d: -f1)
      SUGGESTIONS_LOG="${SUGGESTIONS_LOG}\n### \`$FILE:${LINE_NUM:-?}\` — Script inline dans HTML\n**Problème** : $SCRIPT_INLINE balise(s) \`<script>\` inline détectée(s)\n**Suggestion** : Extraire dans un fichier \`.ts\` ou \`.js\` séparé et l'importer avec \`<script src=\"...\"\`>\n**Pourquoi** : Séparation des responsabilités, meilleure maintenabilité et CSP\n\n"
      echo "  🟡 $FILE — script inline → suggestion ajoutée"
    fi
  fi

  # --- CSS ---
  if [[ "$EXT" == "css" || "$EXT" == "scss" ]]; then
    # Détecte !important → suggestion
    IMPORTANT_COUNT=$(grep -c '!important' "$FILE" 2>/dev/null || echo 0)
    if [ "$IMPORTANT_COUNT" -gt 0 ]; then
      LINE_NUM=$(grep -n '!important' "$FILE" 2>/dev/null | head -1 | cut -d: -f1)
      SUGGESTIONS_LOG="${SUGGESTIONS_LOG}\n### \`$FILE:${LINE_NUM:-?}\` — Usage de \`!important\`\n**Problème** : $IMPORTANT_COUNT occurrence(s) de \`!important\`\n**Suggestion** : Revoir la spécificité CSS plutôt que forcer avec \`!important\`\n**Pourquoi** : \`!important\` rend le CSS difficile à maintenir et à surcharger\n\n"
      echo "  🔵 $FILE — $IMPORTANT_COUNT !important → suggestion ajoutée"
    fi
  fi

done <<< "$ALL_FILES"

# ─────────────────────────────────────────────
# Écriture de REFACTOR_SUGGESTIONS.md
# ─────────────────────────────────────────────

if [ -n "$SUGGESTIONS_LOG" ] || [ -n "$ACTIONS_LOG" ]; then
  cat > "$SUGGESTIONS_FILE" << EOF
# Suggestions de refactoring
_Généré le $DATE — À revoir avant le prochain commit_

---

## 🔴🟡🔵 Suggestions (Niveau 2 — à appliquer manuellement)

$(echo -e "$SUGGESTIONS_LOG")

---

## ✅ Actions automatiques appliquées (Niveau 1)

$(echo -e "$ACTIONS_LOG")

---
_Pour appliquer une suggestion : dis à Cursor "applique la suggestion [fichier:ligne] de REFACTOR_SUGGESTIONS.md"_
EOF

  echo ""
  echo "📄 REFACTOR_SUGGESTIONS.md mis à jour"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

exit 0
