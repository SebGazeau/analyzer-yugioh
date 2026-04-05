/** Navigation par onglets (header) — extrait pour éviter les cycles avec insights/panel. */

export const TAB_ID_BUILDER = 'builder' as const;
export const TAB_ID_DECKS = 'decks' as const;
export const TAB_ID_ANALYSIS = 'analysis' as const;
export const TAB_ID_SUGGESTIONS = 'suggestions' as const;

export const TAB_PANEL_IDS = [
    TAB_ID_BUILDER,
    TAB_ID_DECKS,
    TAB_ID_ANALYSIS,
    TAB_ID_SUGGESTIONS,
] as const;

export type TabPanelId = (typeof TAB_PANEL_IDS)[number];

/** Attribut `data-tab` sur les liens d’en-tête. */
export const TAB_DATA_ATTR = 'data-tab';

export const APP_TAB_SELECTOR = '.app-tab';
export const APP_TAB_ACTIVE_SELECTOR = '.app-tab.app-tab--active';

export function setActiveTab(tabId: string): void {
    document.querySelectorAll(APP_TAB_SELECTOR).forEach((a) => {
        a.classList.remove('app-tab--active');
        a.setAttribute('aria-selected', 'false');
    });
    const activeTab = document.querySelector(`${APP_TAB_SELECTOR}[${TAB_DATA_ATTR}="${tabId}"]`);
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
    setActiveTab(TAB_ID_BUILDER);
    document.querySelectorAll<HTMLAnchorElement>(APP_TAB_SELECTOR).forEach((a) => {
        a.addEventListener('click', (e) => {
            e.preventDefault();
            if (a.hidden) return;
            const tabId = a.getAttribute(TAB_DATA_ATTR) || '';
            setActiveTab(tabId);
        });
    });
}
