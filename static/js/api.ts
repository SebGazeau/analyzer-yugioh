// Fonctions d'accès à l'API
export interface Card {
    name: string;
    name_en?: string;
    [key: string]: any;
}

/** Récupère une carte par nom exact (pour l'import). Essaie /card puis /search avec variantes. */
export async function fetchCardByName(name: string): Promise<Card | null> {
    const trimmed = name.trim();
    if (!trimmed) return null;

    const tryExact = async (n: string): Promise<Card | null> => {
        const r = await fetch(`/card?name=${encodeURIComponent(n)}`);
        if (!r.ok) return null;
        const card = await r.json();
        return card && typeof card === 'object' && card.name ? card : null;
    };

    let card = await tryExact(trimmed);
    if (card) return card;

    const variants = [
        trimmed,
        trimmed.replace(/\s*&\s*/g, ' and '),
        trimmed.replace(/\s+and\s+/gi, ' & '),
    ].filter((v, i, a) => a.indexOf(v) === i);

    for (const v of variants) {
        if (v === trimmed) continue;
        card = await tryExact(v);
        if (card) return card;
    }

    if (trimmed.length >= 4) {
        const r = await fetch(`/search?q=${encodeURIComponent(trimmed)}`);
        if (!r.ok) return null;
        const cards: Card[] = await r.json();
        return cards.find((c: Card) => c.name === trimmed || c.name_en === trimmed) || null;
    }
    return null;
} 