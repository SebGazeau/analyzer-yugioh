-- Historique : ne plus utiliser pour l’insight (heuristique uniquement) ; voir `20260415140500_*`.
INSERT INTO insight_fidraulis_gy_admin_validated_passcode (passcode)
VALUES (74586817)
ON CONFLICT (passcode) DO NOTHING;
