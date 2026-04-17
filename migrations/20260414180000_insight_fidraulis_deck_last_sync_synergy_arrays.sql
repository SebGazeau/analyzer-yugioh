-- Derniers ensembles synergy par deck pour incréments delta (évite recompter tout l’Extra à chaque mise à jour).
-- NULL = ligne créée avant cette migration : premier POST persisté après déploiement = baseline (remplit les tableaux, sans bump des stats).

ALTER TABLE insight_fidraulis_deck_last_sync
    ADD COLUMN IF NOT EXISTS last_synergy_verified BIGINT[],
    ADD COLUMN IF NOT EXISTS last_synergy_heuristic BIGINT[];
