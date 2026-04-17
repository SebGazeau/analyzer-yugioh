-- Retrait Omega de la validation admin : détection uniquement via heuristique `effect_if_in_gy`.
DELETE FROM insight_fidraulis_gy_admin_validated_passcode
WHERE passcode = 74586817;
