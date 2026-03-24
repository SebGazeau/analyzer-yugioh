# Authentification : API (JWT) et Web (sessions)

Ce document décrit le schéma d’authentification : **JWT** pour l’API (documentée dans Swagger) et **sessions cookie** pour les routes web.

---

## 1. Vue d’ensemble

| Contexte | Mécanisme | Routes |
|----------|-----------|--------|
| **API**  | JWT (Bearer) | `/api/auth/token`, `/api/profile` |
| **Web**  | Session cookie (actix-session), même clé `site_user_pseudo` que le site | `GET /web/login` (redirige vers `/`), `/web/logout`, `/web/dashboard` |
| **Admin** | Header `X-Admin-Key` uniquement (`ADMIN_SECRET`, pas de query `admin_key`) | `/admin/*` |
| **Decks (JSON)** | Session cookie (`site_user_pseudo`) | `/decks`, `/decks/{id}` |

---

## 2. Variables d’environnement

- **`JWT_SECRET`** : secret pour signer les JWT et clé pour obtenir un token (`POST /api/auth/token` avec `api_key = JWT_SECRET`). Si absent, les routes `/api` et Swagger ne sont pas enregistrées.
- **`SESSION_SECRET`** : clé (jusqu’à 64 octets) pour signer les cookies de session. Si absente, une clé par défaut est utilisée (sessions non persistantes entre redémarrages).
- **`ADMIN_SECRET`** : protège `/admin` via le header `X-Admin-Key` uniquement (voir `docs/pipeline_images.md`).

---

## 3. API (JWT)

- **`POST /api/auth/token`**  
  Body : `{ "api_key": "<JWT_SECRET>" }`.  
  Réponse : `{ "token": "<JWT>" }`.  
  Public (pas de Bearer).

- **`GET /api/profile`**  
  Header : `Authorization: Bearer <JWT>`.  
  Réponse : `{ "sub", "role" }`.  
  Protégé par l’extracteur `JwtClaims`.

Les JWT sont signés avec `JWT_SECRET`, durée de validité 24 h. L’extracteur `auth::jwt::JwtClaims` lit le header, décode le token et renvoie 401 si invalide ou absent.

---

## 4. Web (sessions)

- **`GET /web/login`** : **redirection 303** vers `/` (plus de formulaire ni d’impersonation par `user_id`, sec-11).
- **`POST /web/login`** : **supprimé** (404) — la connexion passe par **`POST /login`** sur la page d’accueil (pseudo + mot de passe).
- **`GET /web/dashboard`** : page protégée ; exige la session site **`site_user_pseudo`** (comme `/decks`) ; sinon redirection vers **`/`**.
- **`POST /web/logout`** : retire `site_user_pseudo`, invalide le jeton CSRF, redirection vers **`/`**.

Le middleware `SessionMiddleware` (CookieSessionStore) est enregistré sur toute l’app avec une clé dérivée de `SESSION_SECRET` (ou clé interne par défaut en dev). Les attributs du cookie sont fixés explicitement dans `session_cookies::cookie_session_middleware` (sec-08) : **`HttpOnly`** toujours ; en **production** (`APP_ENV=production`) : **`Secure`** + **`SameSite=Strict`** ; hors production : pas de **`Secure`** (HTTP local) + **`SameSite=Lax`**.

**CSRF (sec-09)** : les `POST` **formulaire** qui s’appuient sur la session (`/login`, `/logout`, `/register`, `/web/logout`) exigent un champ **`csrf_token`** identique au jeton en session (`auth::csrf`). Les pages concernées (`GET /`, `/register`, **`GET /web/dashboard`**) appellent `sync_csrf_token` pour injecter le jeton (Tera ou HTML inline). Après connexion / inscription réussie, le jeton est invalidé (`invalidate_csrf_token`) pour limiter la fixation.

**Rate limit (sec-10)** : avant la session, un `wrap_fn` sur l’`App` appelle `rate_limit::login_post_blocked_response` pour les `POST` `/login`, `/register` et `/admin/login` (fenêtre **1 minute** par **IP**). Variables : `SITE_AUTH_RATE_LIMIT_PER_MINUTE`, `ADMIN_LOGIN_RATE_LIMIT_PER_MINUTE`.

Les routes `/web/dashboard` et le helper `require_session` vérifient la présence de **`site_user_pseudo`** (même clé que pour les decks).

---

## 5. Swagger (OpenAPI)

- **URL** : `/swagger-ui/` (et `/api-docs/openapi.json`) lorsque l’UI est **activée**.
- **Activation** : variable **`ENABLE_SWAGGER_UI`** (`true` / `1` / `yes` / `on` → activé ; `false` / `0` / etc. → désactivé). Si la variable est absente ou vide : **activé** hors production, **désactivé** en production (`APP_ENV=production`). Voir `security_startup::swagger_ui_enabled`.
- Le schéma documente `POST /api/auth/token` et `GET /api/profile` avec le schéma de sécurité **Bearer (JWT)**.
- Si `JWT_SECRET` n’est pas défini, les routes `/api` ne sont pas enregistrées ; Swagger peut rester monté (selon `ENABLE_SWAGGER_UI`) mais l’API ne sera pas appelable.

---

## 6. Decks enregistrés (`/decks`)

Les routes JSON **liste, lecture, création, mise à jour et suppression** de decks (`GET/POST /decks`, `GET/PUT/DELETE /decks/{id}`) exigent une **session site** : cookie défini après **inscription** ou **connexion** (`POST /register`, `POST /login`), clé de session `site_user_pseudo`.

- Sans connexion : **401 Unauthorized** avec un corps JSON `{ "error": "…" }`.
- Chaque deck est lié à `decks.site_user_id` → `site_users.id` ; un utilisateur ne voit et ne modifie que ses propres decks.

Le **builder** (pages HTML, recherche, validation locale) reste utilisable sans compte ; seule la **persistance serveur** est réservée aux comptes connectés.

---

## 7. Décisions techniques

- **JWT** : extracteur `JwtClaims` (FromRequest) au lieu d’un middleware Transform, pour rester compatible avec les scopes Actix et éviter d’implémenter `Transform` à la main.
- **Sessions** : `actix-session` avec `CookieSessionStore` ; clé dérivée de `SESSION_SECRET` (64 octets, troncation/remplissage si nécessaire) ; politique cookie explicite (`session_cookies`, voir §4) ; jeton CSRF synchroniseur sur les POST HTML (`auth::csrf`, sec-09).
- **Documentation** : `utoipa` + `utoipa-swagger-ui` ; schéma Bearer via `HttpBuilder::new().scheme(Bearer).bearer_format("JWT").build()`.
- **Decks** : auth par session cookie (même mécanisme que la page d’accueil), pas par JWT.

Ces choix sont résumés dans `docs/decisions.md` si besoin.
