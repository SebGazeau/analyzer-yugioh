# Checklist sécurité — actions manuelles

Ce fichier liste ce que **tu dois vérifier toi-même** (environnements réels, secrets, déploiements), et **pourquoi**. Les tests automatisés ne remplacent pas ces contrôles.

---

## sec-01 — Secrets au démarrage (`APP_ENV=production`)

| Action | Pourquoi |
|--------|----------|
| Définir `APP_ENV=production` (ou `RUST_ENV`) sur **Cloud Run / prod** | Active l’exigence de secrets forts ; sans ça, l’app reste en mode « développement » côté validation. |
| Vérifier que le service **refuse de démarrer** si `ADMIN_SECRET` ou `SESSION_SECRET` est absent ou &lt; 32 octets UTF-8 | Sinon tu crois être en prod alors que la config est rejetée silencieusement… ou l’inverse : tu déploies sans t’en rendre compte. |
| Après un déploiement, confirmer **exit code 1** (admin) / **2** (session) sur échec volontaire | Pour brancher des alertes (healthcheck, CI) si besoin. |
| En **local sans** `APP_ENV=production`, lire les **`tracing::warn`** au démarrage (admin ouvert, session à zéros, secrets courts) | Le comportement reste tolérant pour le dev ; les warnings rappellent le risque si tu réutilises la même `.env` en prod. |
| Mettre à jour ton **Secret Manager** / variables Cloud Run : `ADMIN_SECRET`, `SESSION_SECRET` (≥ 32 caractères chacun) | Les placeholders `.env.example` ne sont pas des secrets réels. |

---

## sec-02 — Import d’images (`POST /images/import`)

| Action | Pourquoi |
|--------|----------|
| Appeler l’**import**, **`GET /images`** et **`GET /images/{id}`** avec **`X-Admin-Key`** (ou JWT admin / session admin) lorsque **`ADMIN_SECRET`** est défini | **`GET /images/{id}/file/...`** est public (vignettes builder). Sinon **403** sur les routes admin (voir sec-06). |
| Vérifier qu’une URL **hors allowlist** (ex. autre domaine que celui autorisé) renvoie **400** | Limite le SSRF ; par défaut seuls les hôtes dont le nom finit par un suffixe autorisé (ex. `ygoprodeck.com`) passent. |
| Si tu dois importer depuis un autre CDN, définir **`IMAGE_IMPORT_ALLOWED_HOST_SUFFIXES`** (suffixes séparés par des virgules, voir `.env.example`) | Sinon les imports légitimes depuis ce domaine seront refusés. |
| Tester une URL **HTTPS** valide autorisée avec une petite image (stack avec DB + storage) | Valide le chemin heureux de bout en bout. |
| Optionnel : **`IMAGE_IMPORT_MAX_BYTES`** (entre 1 KiB et 100 MiB, défaut 15 MiB) | Limite la taille du corps téléchargé (anti-DoS mémoire). |
| Rappel : si **`ADMIN_SECRET`** est absent (mode dev), l’import reste **sans clé** jusqu’à ce qu’on durcisse ce cas — les warnings sec-01 s’appliquent. | Évite de croire que l’endpoint est fermé en local sans secret. |

---

## sec-03 — JWT : signature vs clé d’émission (`/api/auth/token`)

| Action | Pourquoi |
|--------|----------|
| Définir **`JWT_SECRET`** (signature / vérif Bearer) et **`API_ISSUER_SECRET`** (corps `api_key` du POST token) avec **deux valeurs différentes** en prod | Une fuite de la clé d’échange ne suffit pas à forger des JWT si la clé de signature reste secrète (et inversement selon le flux). |
| Vérifier les logs au démarrage : absence de warning « API_ISSUER_SECRET absent » en prod | Si le warning apparaît, la clé d’émission est encore identique à `JWT_SECRET`. |
| Mettre à jour les scripts / clients qui appellent `/api/auth/token` : envoyer **`API_ISSUER_SECRET`** dans `api_key`, pas `JWT_SECRET` | Sinon **401** après séparation des secrets. |

---

## sec-04 — Clé admin : header uniquement (plus de `?admin_key=`)

| Action | Pourquoi |
|--------|----------|
| Remplacer tout lien ou script qui passait la clé en **query** (`?admin_key=...`) par le header **`X-Admin-Key`** | Les secrets en URL fuient dans l’historique, les logs proxy et l’en-tête **Referer**. |
| Vérifier avec **curl** : `POST /admin/import` (ou autre route protégée) **sans** header mais avec `?admin_key=<secret>` → **403** | Confirme que seul le header compte. |
| Mettre à jour la doc interne / runbooks qui montraient encore `admin_key` dans l’URL | Évite qu’un collègue réintroduise une URL partageable avec secret. |

---

## sec-05 — Swagger UI / OpenAPI

| Action | Pourquoi |
|--------|----------|
| En **production** (`APP_ENV=production`), vérifier que **`GET /swagger-ui/...`** et **`GET /api-docs/openapi.json`** renvoient **404** sans variable explicite | La doc d’API est désactivée par défaut en prod pour limiter la cartographie automatique. |
| Si tu as besoin de Swagger en prod (debug ponctuel), définir **`ENABLE_SWAGGER_UI=true`** (ou `1` / `yes` / `on`) dans l’environnement du service | Réactive volontairement ; pense à le retirer après usage. |
| Pour **désactiver** Swagger même en dev, **`ENABLE_SWAGGER_UI=0`** (ou `false` / `no` / `off`) | Réduit la surface sur un réseau partagé. |

---

## sec-06 — Lecture des images (liste / métadonnées vs fichiers)

| Action | Pourquoi |
|--------|----------|
| Appeler **`GET /images`** et **`GET /images/{id}`** avec la **même auth** que **`POST /images/import`** (`X-Admin-Key`, JWT admin, ou session admin) | Évite l’énumération des imports et des URLs sources pour les anonymes. |
| **`GET /images/{id}/file/{variant}`** : **sans auth** ; l’UUID sert de lien opaque (comme un CDN minimal) | Les vignettes du builder utilisent ces URLs ; sans accès public, les `<img>` recevaient **403**. |
| Vérifier **403** sans credentials sur **`GET /images`** lorsque **`ADMIN_SECRET`** est défini | Les fichiers binaires restent accessibles par UUID connu (via `/search` après import), pas la liste complète. |

---

## sec-07 — Décodage JWT strict (algorithme + expiration)

| Action | Pourquoi |
|--------|----------|
| S’assurer que les clients et scripts émettent des JWT en **HS256** avec une claim **`exp`** | Le serveur n’accepte que HS256 et exige `exp` ; un autre algorithme ou un token sans date d’expiration est rejeté. |
| Vérifier qu’un token **expiré** reçoit **401** sur les routes Bearer (et que l’admin ne valide pas un JWT périmé) | La validation `exp` est active ; marge de décalage d’horloge = défaut de la crate (léger `leeway`). |
| Éviter de « désendurcir » le décodeur (ex. accepter plusieurs algos ou désactiver la signature) sans revue sécu | Toute évolution doit rester alignée avec `jwt_decoding_validation()` dans `src/auth/jwt.rs` + tests associés. |

---

## sec-08 — Cookies de session (`HttpOnly`, `Secure`, `SameSite`)

| Action | Pourquoi |
|--------|----------|
| En **production** (`APP_ENV=production`), servir l’app en **HTTPS** | Les cookies sont émis avec **`Secure`** et **`SameSite=Strict`** ; sans TLS le navigateur ne conservera pas / n’enverra pas le cookie correctement. |
| En **développement** (HTTP local / Docker), accepter l’absence du flag **`Secure`** sur le cookie | Sinon la session ne tient pas sur `http://localhost` ; la politique « dev » utilise `SameSite=Lax` et pas de `Secure`. |
| Vérifier dans les DevTools (onglet Réseau → en-tête `Set-Cookie` après **`GET /`** ou après **`POST /login`** réussi) : **`HttpOnly`** toujours présent | Limite le vol de session par XSS ; aligné sur `session_cookies::cookie_session_middleware`. |
| Si un flux légitime **cross-site** vers `/web/*` casse en prod, revoir `SameSite` et la doc **sec-09** plutôt que revenir à `None` sans analyse | `Strict` réduit le CSRF ; un besoin OAuth/cross-domain impose une stratégie explicite. |

---

## sec-09 — CSRF (formulaires session + complément à SameSite)

| Action | Pourquoi |
|--------|----------|
| Vérifier que les **formulaires HTML** qui modifient l’état (`POST /login`, `/logout`, `/register`, `/web/logout`) incluent le champ caché **`csrf_token`** aligné sur la session | Le serveur compare au jeton stocké côté session (`auth::csrf`) ; sans jeton ou jeton faux → **403**. |
| Après déploiement, test manuel : soumettre un formulaire **sans** `csrf_token` (ex. requête forgée) → **403** avec message « Jeton CSRF… » | Confirme que la couche n’a pas été contournée par un proxy ou un cache qui strip les champs. |
| Rappel : **`SameSite`** (sec-08) bloque beaucoup de CSRF cross-site ; le jeton synchroniseur couvre surtout le **même site** (XSS partielle, sous-domaines, régressions cookie). | Les appels **`fetch` JSON** (`/decks`, etc.) depuis le front **same-origin** restent couverts par la politique cookie + origine ; un client tiers devrait utiliser **JWT**, pas le cookie de session. |
| Tout nouvel endpoint **POST** formulaire + session doit appeler `verify_csrf_token` et exposer le jeton sur la page GET correspondante. | Évite de réintroduire un trou en ajoutant un formulaire oublié. |

---

## sec-10 — Rate limiting (login site + login admin)

| Action | Pourquoi |
|--------|----------|
| Ajuster **`SITE_AUTH_RATE_LIMIT_PER_MINUTE`** et **`ADMIN_LOGIN_RATE_LIMIT_PER_MINUTE`** (voir `.env.example`) si des utilisateurs légitimes se font bloquer | Défauts : 30 / min pour `POST` `/login`, `/register` ; 15 / min pour `POST` `/admin/login` ; **fenêtre fixe 1 minute** par **IP** (`rate_limit.rs`). |
| Derrière un reverse proxy, vérifier que l’IP vue par l’app est bien celle du client (sinon tout le monde partage la même clé) | Aujourd’hui la clé est dérivée du **pair TCP** (`peer_addr`) ; sans `X-Forwarded-For` de confiance, un NAT peut regrouper des clients. |
| Test manuel : rafale de `POST` (ex. `curl` en boucle) sur `/login` → **429** avec **`Retry-After: 60`** | Confirme `login_post_blocked_response` + `wrap_fn` sur l’`App` (voir `app.rs`). |

---

## sec-11 — Plus de connexion factice `/web/login`

| Action | Pourquoi |
|--------|----------|
| Vérifier que **`GET /web/login`** renvoie une **redirection** vers **`/`** et qu’un **`POST /web/login`** renvoie **404** | Empêche l’ancienne impersonation par `user_id` arbitraire en session. |
| Accéder à **`/web/dashboard`** : sans session site → redirection vers **`/`** ; avec compte connecté via **`POST /login`** → page avec le **pseudo** (même clé `site_user_pseudo` que `/decks`). | Alignement sur l’auth réelle du site. |

---

## sec-12 — Traitement image (`process_image`, anti image bomb)

| Action | Pourquoi |
|--------|----------|
| Rappel : **`IMAGE_IMPORT_MAX_BYTES`** borne aussi **`process_image`** (rejet avant décodage) | Même plafond téléchargement + décodeur ; défense en profondeur si les bytes viennent d’ailleurs. |
| Images source **> 4096 px** en largeur ou hauteur → échec contrôlé au décodage (`cargo test images::process`) | Limite pixels / RAM côté crate **image** (`Limits`). |

---

## Rappel

- **Ne pas committer** `.env` avec de vrais secrets.
- Après chaque slice : `cargo test` (et tests front si concerné).

---

## sec-13 — Reset mot de passe (2FA + support/admin, sans email)

| Action | Pourquoi |
|--------|----------|
| Vérifier que `POST /auth/forgot-password` répond le **même message** pour un compte existant et inexistant | Empêche l’énumération de comptes. |
| Contrôler que les `recovery_code` et `temp_code` sont stockés **hashés** uniquement (jamais en clair en DB/logs) | Réduit l’impact d’une fuite DB ou logs. |
| Confirmer TTL court (15-30 min), usage unique, compteur de tentatives et **429** au dépassement | Limite brute force et réutilisation de code. |
| Vérifier qu’après `POST /auth/reset-password` toutes les sessions actives et refresh tokens sont invalidés | Empêche une session volée de survivre au reset. |
| Sur le parcours admin, exiger une validation hors app (présentiel) avant `issue-temp-code` | Sans canal secondaire vérifié, l’identité n’est pas prouvée. |
| Contrôler la présence d’entrées d’audit complètes (`security_audit_events`) pour: demande, validation, émission code, reset final | Garantit traçabilité et capacité d’enquête. |
| Vérifier qu’un compte sans 2FA est forcé à activer la 2FA après reset (`force_enable_2fa_after_reset`) | Réduit le risque de récidive sur comptes faibles. |
| Vérifier la rotation de `session_epoch` après reset mot de passe et la déconnexion effective des anciennes sessions | Révocation globale de sessions sans store serveur centralisé. |
| Vérifier les limites `RESET_AUTH_RATE_LIMIT_PER_MINUTE` et `RESET_ADMIN_ISSUE_RATE_LIMIT_PER_MINUTE` | Réduit le brute force sur les étapes de récupération et l’émission admin. |
| Vérifier que les endpoints profil 2FA (`/mon-compte/2fa/setup`, `/enable`, `/recovery-codes/rotate`) exigent **ré-auth** (`current_password`) + CSRF | Empêche l’activation/rotation 2FA via session volée ou CSRF seule. |
| Vérifier qu’un setup 2FA non confirmé expire (TTL court) et qu’un code TOTP après expiration est refusé | Réduit la fenêtre d’abus d’un secret intermédiaire. |
| Vérifier la rotation systématique des recovery codes à l’activation 2FA et lors d’une régénération manuelle | Invalide immédiatement les anciens lots compromis ou perdus. |
| Contrôler les événements d’audit `profile_twofa_setup_started`, `profile_twofa_enabled`, `profile_twofa_recovery_codes_rotated` | Traçabilité des actions sensibles côté profil utilisateur. |
