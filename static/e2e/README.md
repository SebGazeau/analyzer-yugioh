# E2E Playwright

Tests de parcours critiques contre l’app (serveur Rust).

- **Sans serveur** : `npm run test:e2e` démarre `cargo run` depuis la racine du repo puis lance les tests (première fois ~2 min de compile).
- **Avec serveur** : lancer `make dev` dans un terminal, puis `BASE_URL=http://localhost:8080 npm run test:e2e` pour réutiliser le serveur (pas de webServer).

Chromium uniquement. Pour l’UI : `npm run test:e2e:ui`.

- `search-locale.spec.ts` : vérifie que le builder envoie `locale=` sur `/search` selon `<html lang>`.
