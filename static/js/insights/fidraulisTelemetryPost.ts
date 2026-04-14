/**
 * POST télémétrie Fidraulis après sauvegarde deck (session + CSRF + empreinte).
 *
 * Point d’entrée appelé depuis `deck.ts` :
 * - `saveDeckToServer` → `postFidraulisTelemetryAfterDeckSave(newDeckId, getDeckState())`
 * - `updateDeckOnServer` → `postFidraulisTelemetryAfterDeckSave(deck.id, getDeckState())`
 *
 * Le 2ᵉ argument est **obligatoire en pratique** : le `import()` dynamique s’exécute plus tard ;
 * `getDeckState()` à ce moment-là peut être vide (alert, refresh liste, chargement deck, etc.).
 *
 * Handler HTTP serveur : `post_fidraulis_telemetry` dans
 * `src/modules/insights_fidraulis_telemetry/routes.rs` (POST `/insights/fidraulis/telemetry`).
 *
 * Aligné serveur : même périmètre que l’insight `fidraulis_gy_synchro` — au moins un Synchro
 * Extra « ressource GY » (allowlist ou heuristique) avec Fidraulis en Main/Side.
 */
import { getDeckState } from '../deck.js';
import {
    FIDRAULIS_HARMONIA_PASSCODE,
    normalizedNameIndicatesFidraulisHarmonia,
} from './fidraulisGy.js';
import { builderGridQualifiesForFidraulisTelemetryPost } from './fidraulisTelemetryPostGate.js';
import {
    computeFidraulisTelemetryFingerprint,
    type FidraulisTelemetryZoneRow,
} from './fidraulisTelemetryFingerprint.js';
import type { DeckBuilderGridState, DeckRow } from '../deck.js';
import { coercePositivePasscode } from '../utils/coercePasscode.js';
import { cardTypeKindFromTypeStringOrNull } from '../utils/cardTypeKind.js';
import { CARD_TYPE_KIND_MONSTER } from '../utils/cardTypeKindConstants.js';

function telemetryModeFromDom(): string {
    if (typeof document === 'undefined') return 'off';
    return document.body?.dataset.fidraulisTelemetry ?? 'off';
}

function csrfTokenFromDom(): string | null {
    if (typeof document === 'undefined') return null;
    const t = document.body?.dataset.csrfToken?.trim();
    return t && t.length > 0 ? t : null;
}

function normalizeNameForTelemetry(name: string): string {
    return name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
}

/** Même règle que l’insight : passcode connu d’abord ; nom + type (FR « Monstre » inclus via cardTypeKind). */
function rowPasscodeForTelemetry(r: DeckRow): number | undefined {
    const cid = coercePositivePasscode(r.cardId);
    if (cid != null) return cid;
    if (cardTypeKindFromTypeStringOrNull(r.type) !== CARD_TYPE_KIND_MONSTER) return undefined;
    const n = normalizeNameForTelemetry(r.name);
    if (normalizedNameIndicatesFidraulisHarmonia(n)) return FIDRAULIS_HARMONIA_PASSCODE;
    return undefined;
}

function rowsToZonePayload(rows: DeckRow[]): FidraulisTelemetryZoneRow[] {
    const out: FidraulisTelemetryZoneRow[] = [];
    for (const r of rows) {
        if (r.quantity <= 0) continue;
        const passcode = rowPasscodeForTelemetry(r);
        if (passcode == null || passcode <= 0) continue;
        out.push({ passcode, qty: r.quantity });
    }
    return out;
}

function zonesDeclareFidraulis(main: FidraulisTelemetryZoneRow[], side: FidraulisTelemetryZoneRow[]): boolean {
    const has = (rows: FidraulisTelemetryZoneRow[]) =>
        rows.some((r) => r.passcode === FIDRAULIS_HARMONIA_PASSCODE && r.qty > 0);
    return has(main) || has(side);
}

const STORAGE_FP_PREFIX = 'fid_telemetry_fp_v1:';

/**
 * @param gridAtSaveTime — Snapshot `getDeckState()` pris **synchronement** au succès save/update
 *   (avant alert / async). Si absent, retombe sur `getDeckState()` au moment du callback (fragile).
 */
export async function postFidraulisTelemetryAfterDeckSave(
    deckId: number,
    gridAtSaveTime?: DeckBuilderGridState,
): Promise<void> {
    const mode = telemetryModeFromDom();
    if (mode === 'off' || !Number.isFinite(deckId) || deckId <= 0) {
        return;
    }

    const s = gridAtSaveTime ?? getDeckState();
    const mainRows = s.main;
    const extraRows = s.extra;
    const sideRows = s.side ?? [];

    const main = rowsToZonePayload(mainRows);
    const extra = rowsToZonePayload(extraRows);
    const side = rowsToZonePayload(sideRows);

    if (!builderGridQualifiesForFidraulisTelemetryPost(s)) {
        return;
    }

    const hasFid = zonesDeclareFidraulis(main, side);
    if (!hasFid) {
        return;
    }

    const fingerprint = await computeFidraulisTelemetryFingerprint(hasFid, main, extra, side);
    const key = STORAGE_FP_PREFIX + deckId;
    if (sessionStorage.getItem(key) === fingerprint) {
        return;
    }

    const csrf = csrfTokenFromDom();
    if (!csrf) {
        return;
    }

    const bodyJson = JSON.stringify({
        deck_id: deckId,
        fingerprint,
        main,
        extra,
        side,
    });

    const res = await fetch('/insights/fidraulis/telemetry', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrf,
        },
        body: bodyJson,
    });

    if (res.status === 204 || res.ok) {
        sessionStorage.setItem(key, fingerprint);
    }
}
