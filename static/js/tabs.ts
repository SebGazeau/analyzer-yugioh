/** Navigation par onglets (header) — extrait pour éviter les cycles avec insights/panel. */

export const TAB_PANEL_IDS = ['builder', 'decks', 'analysis', 'suggestions'] as const;

export function setActiveTab(tabId: string): void {
    document.querySelectorAll('.app-tab').forEach((a) => {
        a.classList.remove('app-tab--active');
        a.setAttribute('aria-selected', 'false');
    });
    const activeTab = document.querySelector(`.app-tab[data-tab="${tabId}"]`);
    if (activeTab) {
        activeTab.classList.add('app-tab--active');
        activeTab.setAttribute('aria-selected', 'true');
    }
    TAB_PANEL_IDS.forEach((id) => {
        const panel = document.getElementById(id);
        if (panel) {
            panel.classList.toggle('tab-panel--active', id === tabId);
        }
    });
}

export function bindAppTabs(): void {
    setActiveTab('builder');
    document.querySelectorAll<HTMLAnchorElement>('.app-tab').forEach((a) => {
        a.addEventListener('click', (e) => {
            e.preventDefault();
            if (a.hidden) return;
            const tabId = a.getAttribute('data-tab') || '';
            setActiveTab(tabId);
        });
    });
}
