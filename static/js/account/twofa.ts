import { DOM_EVENT_SUBMIT } from '../utils/domEventNames.js';

type TwofaAction = 'setup' | 'enable' | 'rotate';

const ROOT_SELECTOR = '[data-twofa-root]';

function readCsrfToken(): string {
    return document.body.getAttribute('data-csrf-token') || '';
}

function setText(selector: string, value: string): void {
    const node = document.querySelector<HTMLElement>(selector);
    if (node) {
        node.textContent = value;
    }
}

function clearMessages(): void {
    setText('[data-twofa-secret]', '');
    setText('[data-twofa-codes]', '');
    setText('[data-twofa-error]', '');
}

function setStatus(enabled: boolean, pending: boolean): void {
    if (enabled) {
        setText('[data-twofa-status]', '2FA activée.');
        return;
    }
    if (pending) {
        setText('[data-twofa-status]', 'Setup 2FA en attente de confirmation.');
        return;
    }
    setText('[data-twofa-status]', '2FA non activée.');
}

function mapError(errorCode: string): string {
    if (errorCode === 'invalid_credentials') return 'Mot de passe actuel invalide.';
    if (errorCode === 'invalid_totp') return 'Code 2FA invalide ou setup expiré.';
    if (errorCode === 'rate_limited') return 'Trop de tentatives. Réessayez plus tard.';
    if (errorCode === 'database') return 'Service indisponible temporairement.';
    if (errorCode === 'unauthenticated') return 'Session expirée. Reconnectez-vous.';
    if (errorCode === 'invalid_request') return 'Action impossible dans l’état actuel.';
    return 'Action impossible pour le moment.';
}

function setupMessage(data: unknown): string {
    const payload = data as { secret?: string; otpauth_url?: string; setup_expires_at?: string };
    return [
        'Secret 2FA généré.',
        payload.secret ? `Secret: ${payload.secret}` : '',
        payload.otpauth_url ? `OTPAuth: ${payload.otpauth_url}` : '',
        payload.setup_expires_at ? `Expire le: ${payload.setup_expires_at}` : '',
    ]
        .filter(Boolean)
        .join('\n');
}

function recoveryCodesMessage(data: unknown): string {
    const payload = data as { recovery_codes?: string[] };
    const joined = Array.isArray(payload.recovery_codes) ? payload.recovery_codes.join(', ') : '';
    return joined
        ? `Recovery codes (affichage unique): ${joined}`
        : 'Recovery codes générés.';
}

function endpointFor(action: TwofaAction): string {
    if (action === 'setup') return '/mon-compte/2fa/setup';
    if (action === 'enable') return '/mon-compte/2fa/enable';
    return '/mon-compte/2fa/recovery-codes/rotate';
}

export function bindAccountTwofa(): void {
    const root = document.querySelector<HTMLElement>(ROOT_SELECTOR);
    if (!root) return;
    setStatus(
        root.getAttribute('data-twofa-enabled') === '1',
        root.getAttribute('data-twofa-setup-pending') === '1',
    );
    const csrfToken = readCsrfToken();
    const forms = document.querySelectorAll<HTMLFormElement>('form[data-twofa-action]');
    forms.forEach((form) => {
        form.addEventListener(DOM_EVENT_SUBMIT, async (event) => {
            event.preventDefault();
            clearMessages();
            const action = form.getAttribute('data-twofa-action') as TwofaAction | null;
            if (!action) return;
            const formData = new FormData(form);
            const payload: Record<string, string> = {
                current_password: String(formData.get('current_password') || ''),
                csrf_token: csrfToken,
            };
            if (action === 'enable') {
                payload.totp_code = String(formData.get('totp_code') || '');
            }
            try {
                const response = await fetch(endpointFor(action), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                const data = (await response.json().catch(() => ({}))) as { error?: string };
                if (!response.ok) {
                    setText('[data-twofa-error]', mapError(String(data.error || '')));
                    return;
                }
                if (action === 'setup') {
                    setStatus(false, true);
                    setText('[data-twofa-secret]', setupMessage(data));
                    return;
                }
                setStatus(true, false);
                setText('[data-twofa-codes]', recoveryCodesMessage(data));
            } catch (_error) {
                setText('[data-twofa-error]', 'Erreur réseau. Réessayez.');
            }
        });
    });
}
