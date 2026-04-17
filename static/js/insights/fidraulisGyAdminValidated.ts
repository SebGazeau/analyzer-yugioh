/**
 * Passcodes « vérifiés » côté admin (JSON injecté sur `<body data-fidraulis-gy-admin-validated>`).
 * Aligné sur `GET /insights/fidraulis/gy/validated-passcodes` et la table SQL correspondante.
 */
function parseAdminValidatedPasscodesFromDom(): ReadonlySet<number> {
    if (typeof document === 'undefined') return new Set();
    const raw = document.body?.dataset.fidraulisGyAdminValidated?.trim();
    if (!raw) return new Set();
    try {
        const arr = JSON.parse(raw) as unknown;
        if (!Array.isArray(arr)) return new Set();
        return new Set(
            arr.filter((x): x is number => typeof x === 'number' && Number.isInteger(x) && x > 0),
        );
    } catch {
        return new Set();
    }
}

export function passcodeIsFidraulisGyAdminValidatedDom(id: number): boolean {
    if (!Number.isInteger(id) || id <= 0) return false;
    return parseAdminValidatedPasscodesFromDom().has(id);
}
