/**
 * Empreinte déterministe pour POST télémétrie Fidraulis (anti-flood).
 * Doit rester alignée avec `crate::modules::insights_fidraulis_telemetry::fingerprint` côté Rust.
 */

export const FIDRAULIS_TELEMETRY_RULE_VERSION = 1 as const;

export type FidraulisTelemetryZoneRow = { passcode: number; qty: number };

function sortZoneRows(rows: FidraulisTelemetryZoneRow[]): FidraulisTelemetryZoneRow[] {
    return [...rows].sort((a, b) => a.passcode - b.passcode || a.qty - b.qty);
}

function zoneCanonical(rows: FidraulisTelemetryZoneRow[]): string {
    return sortZoneRows(rows)
        .filter((r) => r.passcode > 0 && r.qty > 0)
        .map((r) => `${r.passcode}x${r.qty}`)
        .join(',');
}

/**
 * Chaîne canonique avant SHA-256 (hex minuscule).
 * Format : `v{rule}|fid:{0|1}|main:...|extra:...|side:...`
 */
export function fidraulisTelemetryCanonicalString(
    ruleVersion: number,
    hasFidraulis: boolean,
    main: FidraulisTelemetryZoneRow[],
    extra: FidraulisTelemetryZoneRow[],
    side: FidraulisTelemetryZoneRow[],
): string {
    const fid = hasFidraulis ? '1' : '0';
    return `v${ruleVersion}|fid:${fid}|main:${zoneCanonical(main)}|extra:${zoneCanonical(extra)}|side:${zoneCanonical(side)}`;
}

/** SHA-256 hex (async, Web Crypto — dispo navigateur et Node récents sous Vitest). */
export async function sha256HexUtf8(text: string): Promise<string> {
    const enc = new TextEncoder();
    const bytes = enc.encode(text);
    const subtle = globalThis.crypto?.subtle;
    if (!subtle) {
        throw new Error('crypto.subtle indisponible pour empreinte Fidraulis');
    }
    const buf = await subtle.digest('SHA-256', bytes);
    return bufferToHex(buf);
}

function bufferToHex(buf: ArrayBuffer): string {
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function computeFidraulisTelemetryFingerprint(
    hasFidraulis: boolean,
    main: FidraulisTelemetryZoneRow[],
    extra: FidraulisTelemetryZoneRow[],
    side: FidraulisTelemetryZoneRow[],
): Promise<string> {
    const raw = fidraulisTelemetryCanonicalString(
        FIDRAULIS_TELEMETRY_RULE_VERSION,
        hasFidraulis,
        main,
        extra,
        side,
    );
    return sha256HexUtf8(raw);
}
