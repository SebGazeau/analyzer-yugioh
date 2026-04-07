#!/bin/bash
# .cursor/hooks/after-edit.sh
# Déclenché automatiquement après chaque fichier modifié par Cursor.
# Lit le contexte JSON depuis stdin et lance les tests correspondants.

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.file_path // empty' 2>/dev/null || echo "")

# Si on n'a pas de chemin de fichier, on quitte proprement
[ -z "$FILE_PATH" ] && exit 0

WORKSPACE=$(echo "$INPUT" | jq -r '.workspace_roots[0] // empty' 2>/dev/null || echo ".")
cd "$WORKSPACE" 2>/dev/null || exit 0

EXT="${FILE_PATH##*.}"

# --- TypeScript / JavaScript / React / Angular ---
if [[ "$EXT" == "ts" || "$EXT" == "tsx" || "$EXT" == "js" || "$EXT" == "jsx" ]]; then
  # Ignore les fichiers de test eux-mêmes pour éviter une boucle infinie
  if [[ "$FILE_PATH" == *".test."* || "$FILE_PATH" == *".spec."* ]]; then
    exit 0
  fi

  # Cherche le fichier de test correspondant
  BASE="${FILE_PATH%.*}"
  TEST_FILE=""

  for EXT_TEST in "test.ts" "spec.ts" "test.tsx" "spec.tsx" "test.js" "spec.js"; do
    if [ -f "${BASE}.${EXT_TEST}" ]; then
      TEST_FILE="${BASE}.${EXT_TEST}"
      break
    fi
  done

  if [ -n "$TEST_FILE" ]; then
    echo "🧪 Test détecté pour $FILE_PATH → lancement de Vitest..."
    # Lance uniquement les tests liés au fichier modifié
    if command -v npx &>/dev/null; then
      npx vitest run "$TEST_FILE" --reporter=verbose 2>&1
    fi
  else
    echo "ℹ️  Pas de fichier de test trouvé pour $FILE_PATH (pensez à lancer test-writer)"
  fi
fi

# --- Rust ---
if [[ "$EXT" == "rs" ]]; then
  # Ignore les fichiers déjà dans un module de test
  echo "🦀 Fichier Rust modifié : $FILE_PATH → lancement de cargo test..."
  if command -v cargo &>/dev/null; then
    # Lance uniquement les tests du crate concerné
    CARGO_DIR=$(dirname "$FILE_PATH")
    while [ "$CARGO_DIR" != "." ] && [ "$CARGO_DIR" != "/" ]; do
      if [ -f "$CARGO_DIR/Cargo.toml" ]; then
        cargo test --manifest-path "$CARGO_DIR/Cargo.toml" 2>&1
        break
      fi
      CARGO_DIR=$(dirname "$CARGO_DIR")
    done
  fi
fi

# --- HTML / CSS ---
if [[ "$EXT" == "html" || "$EXT" == "css" || "$EXT" == "scss" ]]; then
  echo "🎨 Fichier HTML/CSS modifié : $FILE_PATH (accessibility agent en arrière-plan)"
  # L'agent accessibility tourne en background, rien à faire ici
fi

exit 0
