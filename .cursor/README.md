# Setup Cursor — Sous-agents + Hooks

## Structure à créer dans ton projet

```
ton-projet/
└── .cursor/
    ├── hooks.json              ← déclare les hooks
    ├── hooks/
    │   ├── after-edit.sh       ← lancé après chaque fichier modifié
    │   └── on-stop.sh          ← lancé quand Cursor a terminé
    └── agents/
        ├── best-practices.md   ← background automatique
        ├── security-auditor.md ← background automatique
        ├── accessibility.md    ← background automatique
        ├── test-writer.md      ← à appeler manuellement
        └── refactorer.md       ← à appeler manuellement
```

## Installation

### 1. Copier les fichiers
Place tous ces fichiers dans `.cursor/` à la racine de ton projet.

### 2. Rendre les scripts exécutables (important !)
```bash
chmod +x .cursor/hooks/after-edit.sh
chmod +x .cursor/hooks/on-stop.sh
```

### 3. Vérifier que `jq` est installé
Les scripts utilisent `jq` pour lire le JSON envoyé par Cursor.
```bash
# macOS
brew install jq

# Ubuntu/Debian
sudo apt install jq
```

---

## Comment ça fonctionne

| Agent / Hook | Déclenchement | Action |
|---|---|---|
| `best-practices` | **Auto** (background) | Vérifie les conventions en parallèle |
| `security-auditor` | **Auto** (background) | Cherche les failles en parallèle |
| `accessibility` | **Auto** (background) | Vérifie l'accessibilité en parallèle |
| `after-edit.sh` | **Auto** après chaque fichier modifié | Lance les tests existants (Vitest / cargo test) |
| `on-stop.sh` | **Auto** quand Cursor termine | Affiche un résumé des fichiers changés |
| `test-writer` | **Manuel** | `"Use test-writer to generate tests for this"` |
| `refactorer` | **Manuel** | `"Use refactorer on this file"` |

## Utilisation manuelle des agents

Dans le chat Cursor :
```
Use the test-writer subagent to generate tests for this function
Use the refactorer subagent on src/components/MyComponent.tsx
Run the security-auditor subagent on the auth module
```

---

## Dépannage

- **Les hooks ne se déclenchent pas** → Vérifie que les scripts ont les droits d'exécution (`chmod +x`)
- **Erreur `jq not found`** → Installe `jq` (voir ci-dessus)
- **Les tests ne se lancent pas** → Vérifie que `npx vitest` fonctionne dans ton projet
- **Les agents background ne tournent pas** → Redémarre Cursor après avoir ajouté les fichiers
