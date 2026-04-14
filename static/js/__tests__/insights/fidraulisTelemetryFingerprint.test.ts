import { describe, expect, it } from 'vitest';
import {
    FIDRAULIS_TELEMETRY_RULE_VERSION,
    computeFidraulisTelemetryFingerprint,
    fidraulisTelemetryCanonicalString,
    sha256HexUtf8,
} from '../../insights/fidraulisTelemetryFingerprint.js';

describe('fidraulisTelemetryFingerprint', () => {
    it('canonical string is stable for same zones', () => {
        const a = fidraulisTelemetryCanonicalString(
            FIDRAULIS_TELEMETRY_RULE_VERSION,
            true,
            [{ passcode: 2, qty: 1 }, { passcode: 1, qty: 2 }],
            [{ passcode: 93125329, qty: 1 }],
            [],
        );
        const b = fidraulisTelemetryCanonicalString(
            FIDRAULIS_TELEMETRY_RULE_VERSION,
            true,
            [{ passcode: 1, qty: 2 }, { passcode: 2, qty: 1 }],
            [{ passcode: 93125329, qty: 1 }],
            [],
        );
        expect(a).toBe(b);
        expect(a).toContain('fid:1');
        expect(a).toContain('main:1x2,2x1');
        expect(a).toContain('extra:93125329x1');
        expect(a).toContain('side:');
    });

    it('SHA-256 hex is deterministic for fixed input', async () => {
        const h1 = await sha256HexUtf8('hello');
        const h2 = await sha256HexUtf8('hello');
        expect(h1).toBe(h2);
        expect(h1).toMatch(/^[0-9a-f]{64}$/);
    });

    it('fingerprint changes when extra changes', async () => {
        const f1 = await computeFidraulisTelemetryFingerprint(true, [], [{ passcode: 1, qty: 1 }], []);
        const f2 = await computeFidraulisTelemetryFingerprint(true, [], [{ passcode: 2, qty: 1 }], []);
        expect(f1).not.toBe(f2);
    });
});
