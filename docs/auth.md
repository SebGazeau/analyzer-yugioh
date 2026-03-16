# Authentification : API (JWT) et Web (sessions)

Ce document décrit le schéma d’authentification : **JWT** pour l’API (documentée dans Swagger) et **sessions cookie** pour les routes web.

---

## 1. Vue d’ensemble

| Contexte | Mécanisme | Routes |
|----------|-----------|--------|
| **API**  | JWT (Bearer) | `/api/auth/token`, `/api/profile` |
| **Web**  | Session cookie (actix-session) | `/web/login`, `/web/logout`, `/web/dashboard` |
| **Admin** | Header `X-Admin-Key` (ADMIN_SECRET) | `/admin/*` |

---

## 2. Variables d’environnement

- **`JWT_SECRET`** : secret pour signer les JWT et clé pour obtenir un token (`POST /api/auth/token` avec `api_key = JWT_SECRET`). Si absent, les routes `/api` et Swagger ne sont pas enregistrées.
- **`SESSION_SECRET`** : clé (jusqu’à 64 octets) pour signer les cookies de session. Si absente, une clé par défaut est utilisée (sessions non persistantes entre redémarrages).
- **`ADMIN_SECRET`** : protège `/admin` via le header `X-Admin-Key` (voir `docs/pipeline_images.md`).

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

- **`GET /web/login`** : formulaire (user_id).
- **`POST /web/login`** : enregistre `user_id` en session, redirection vers `/web/dashboard`.
- **`GET /web/dashboard`** : page protégée ; si pas de session, redirection vers `/web/login`.
- **`POST /web/logout`** : purge la session, redirection vers `/web/login`.

Le middleware `SessionMiddleware` (CookieSessionStore) est actif dès qu’une clé de session est fournie (ou par défaut en interne). Les routes `/web/*` utilisent l’extracteur `Session` et le helper `require_session` pour vérifier la présence de `user_id`.

---

## 5. Swagger (OpenAPI)

- **URL** : `/swagger-ui/` (et `/api-docs/openapi.json`).
- Le schéma documente `POST /api/auth/token` et `GET /api/profile` avec le schéma de sécurité **Bearer (JWT)**.
- Si `JWT_SECRET` n’est pas défini, Swagger est tout de même monté mais les routes API ne sont pas enregistrées.

---

## 6. Décisions techniques

- **JWT** : extracteur `JwtClaims` (FromRequest) au lieu d’un middleware Transform, pour rester compatible avec les scopes Actix et éviter d’implémenter `Transform` à la main.
- **Sessions** : `actix-session` avec `CookieSessionStore` ; clé dérivée de `SESSION_SECRET` (64 octets, troncation/remplissage si nécessaire).
- **Documentation** : `utoipa` + `utoipa-swagger-ui` ; schéma Bearer via `HttpBuilder::new().scheme(Bearer).bearer_format("JWT").build()`.

Ces choix sont résumés dans `docs/decisions.md` si besoin.
