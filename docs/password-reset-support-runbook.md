# Runbook support/admin - reset mot de passe sans email

Ce runbook couvre le parcours manuel pour les comptes sans 2FA, avec verification d'identite en presentiel hors application.

Reference fonctionnelle: `docs/password-reset-2fa-admin-workflow.md`.

## 1) Roles et responsabilites

- **Support agent**: prend la demande, verifie les pre-requis, coordonne le rendez-vous presentiel, communique le code temporaire.
- **Admin applicatif**: valide la demande dans l'outil admin, emet le code temporaire, supervise la cloture.
- **Responsable securite (astreinte)**: intervient en cas de suspicion takeover ou d'anomalie.

## 2) Pre-requis avant traitement

- ticket de reset existant (`password_reset_request`) avec identifiant unique;
- demande en statut `pending`;
- utilisateur non eligible au parcours 2FA autonome (sinon rediriger vers ce parcours);
- verification presentielle planifiee.

## 3) Procedure operationnelle standard

### Etape 1 - Reception et triage

1. Ouvrir le ticket et verifier la coherence de la demande.
2. Verifier qu'aucun reset actif n'est deja en cours pour le meme compte.
3. Passer le ticket en `under_review`.

### Etape 2 - Verification presentielle hors app

1. Verifier l'identite en face-a-face selon la politique interne.
2. Renseigner la checklist interne (hors application).
3. Si verification echoue: passer en `rejected`, documenter le motif, notifier l'utilisateur.

### Etape 3 - Approbation admin

1. Appeler `POST /admin/password-reset/:requestId/approve` avec `verification_method=in_person`.
2. Verifier que la demande passe a `approved_by_admin`.
3. Si echec API: ne pas emettre de code; ouvrir incident operationnel.

### Etape 4 - Emission du code temporaire

1. Appeler `POST /admin/password-reset/:requestId/issue-temp-code` (TTL 15 min par defaut).
2. Lire le code brut une seule fois depuis l'interface admin.
3. Communiquer le code par telephone a la personne verifiee.
4. Ne jamais copier le code dans un chat, mail, ticket ou document persistant.

### Etape 5 - Cloture

1. Verifier que l'utilisateur a finalise `POST /auth/reset-password`.
2. Verifier que le statut est `password_reset_done`.
3. Verifier si `force_enable_2fa_after_reset=true` est pose.
4. Cloturer le ticket avec date/heure et identifiant de l'agent.

## 4) Arbre de decision rapide

- **Compte avec 2FA actif** -> ne pas ouvrir parcours manuel, rediriger vers parcours autonome.
- **Compte sans 2FA et verification presentee validee** -> parcours admin autorise.
- **Doute identite / incoherence** -> stop immediate + escalation manager/securite.
- **Tentatives excessives ou comportement suspect** -> lock de la demande + signalement securite.

## 5) Gestion des incidents

### Incident A - Code emis a la mauvaise personne

1. Expirer immediatement la demande (`expired`).
2. Invalider les sessions actives du compte cible (par precaution).
3. Ouvrir incident securite severite elevee.
4. Exporter les logs d'audit associes (`request_id`, `actor_id`, horodatage).

### Incident B - Suspected account takeover

1. Verrouiller temporairement le compte.
2. Revoquer sessions/refresh tokens.
3. Escalader a la securite.
4. Exiger verification presenteille renforcee avant toute reprise.

### Incident C - Panne API admin pendant reset

1. Suspendre la procedure (ne pas improviser hors workflow).
2. Tracer les erreurs techniques.
3. Reprendre uniquement apres retour OK de la couche API.

## 6) Audit et conformite

- chaque action critique doit generer un `security_audit_event`;
- champs minimaux: `event_type`, `actor_type`, `actor_id`, `request_id`, `ip_address`, `created_at`;
- retention conseillee: minimum 12 mois;
- revue mensuelle d'un echantillon de tickets pour verifier:
  - respect de la verification presentielle,
  - absence de fuite de code brut,
  - coherence des statuts metier.

## 7) Scripts de communication (courts)

### Message utilisateur apres ouverture ticket

`Votre demande est en cours. Une verification d'identite en presentiel est requise avant emission d'un code temporaire de reinitialisation.`

### Message utilisateur apres validation support

`Votre verification est terminee. Un agent va vous communiquer par telephone un code temporaire, valable 15 minutes et utilisable une seule fois.`

### Message utilisateur apres cloture

`Votre mot de passe a ete reinitialise. Pour votre securite, activez la double authentification si ce n'est pas deja fait.`
