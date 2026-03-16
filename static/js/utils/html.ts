/**
 * Helpers HTML / format pour le rendu côté client.
 */

export function escapeHtml(s: string): string {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
}

export function formatDeckDate(iso: string): string {
    try {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return iso;
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
        return iso;
    }
}
