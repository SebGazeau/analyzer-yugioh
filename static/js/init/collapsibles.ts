/**
 * Zones repliables : deck (Main/Extra/Side), table Analysis (Engines/Catégories/Groupes).
 */
export function bindCollapsibles(): void {
    document.querySelectorAll('[data-deck-action="toggle-zone"]').forEach((el) => {
        el.addEventListener('click', () => {
            const section = el.closest('.deck-section');
            if (!section) return;
            const expanded = section.classList.toggle('deck-section--collapsed');
            (el as HTMLElement).setAttribute('aria-expanded', String(!expanded));
        });
    });

    const analysisTable = document.querySelector('.analysis-table');
    analysisTable?.addEventListener('click', (e: Event) => {
        const target = (e.target as HTMLElement).closest('tr[data-section-header]');
        if (!target) return;
        const id = target.getAttribute('data-section-header');
        if (!id) return;
        const table = (target as HTMLElement).closest('table');
        if (!table) return;
        const collapsed = table.classList.toggle(`section-${id}-collapsed`);
        target.setAttribute('aria-expanded', String(!collapsed));
        const toggle = target.querySelector('.analysis-section-header-toggle');
        if (toggle) toggle.textContent = collapsed ? '▶' : '▼';
    });
}
