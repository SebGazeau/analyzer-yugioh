-- Votes communautaires Fidraulis GY + validation admin (passcodes « ressource CY »).

CREATE TABLE IF NOT EXISTS insight_fidraulis_gy_admin_validated_passcode (
    passcode BIGINT PRIMARY KEY,
    validated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    admin_user_id UUID REFERENCES admin_users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS insight_fidraulis_gy_user_vote (
    site_user_id UUID NOT NULL REFERENCES site_users (id) ON DELETE CASCADE,
    passcode BIGINT NOT NULL,
    verdict TEXT NOT NULL CHECK (verdict IN ('approve', 'reject')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (site_user_id, passcode)
);

CREATE INDEX IF NOT EXISTS idx_fid_gy_user_vote_passcode
    ON insight_fidraulis_gy_user_vote (passcode);

-- Alignement avec l’allowlist historique (TS / Rust) pour ne pas régresser au déploiement.
INSERT INTO insight_fidraulis_gy_admin_validated_passcode (passcode)
VALUES (72444406),
       (93125329),
       (53971455),
       (78397661),
       (98506199)
ON CONFLICT (passcode) DO NOTHING;
