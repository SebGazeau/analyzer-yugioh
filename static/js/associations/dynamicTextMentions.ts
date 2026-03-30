/**
 * Règles « citation texte » dérivées de l’ancre (archétypes + mots du nom),
 * pour balayer le catalogue de façon pertinente sans liste fixe type Blue-Eyes uniquement.
 */
import { parseArchetypesFromField } from './archetype.js';
import type { AssociationCatalogCard, TextMentionRule } from './types.js';

export type DynamicTextMentionOptions = {
    /** Extraire des patterns depuis les mots du nom (EN puis FR). Défaut true. */
    includeNameWordPatterns?: boolean;
    /** Longueur minimale d’un mot-nom (défaut 5). */
    minNameWordLength?: number;
};

/** Mots trop courts ou trop génériques pour éviter le bruit. */
const STOP_WORDS = new Set([
    'the',
    'and',
    'with',
    'from',
    'your',
    'you',
    'this',
    'that',
    'when',
    'once',
    'while',
    'during',
    'each',
    'every',
    'any',
    'all',
    'both',
    'other',
    'card',
    'cards',
    'monster',
    'monsters',
    'spell',
    'spells',
    'trap',
    'traps',
    'quick-play',
    'quick',
    'play',
    'effect',
    'normal',
    'fusion',
    'synchro',
    'xyz',
    'link',
    'pendulum',
    'ritual',
    'field',
    'equip',
    'continuous',
    'counter',
    'magic',
    'avec',
    'dans',
    'pour',
    'cette',
    'votre',
    'vous',
    'monstre',
    'monstres',
    'magie',
    'piège',
    'pièges',
    // Verbes / nœuds PSCT anglais souvent présents sur des centaines de cartes (extraits du nom → faux positifs massifs)
    'break',
    'chain',
    'phase',
    'target',
    'negate',
    'banish',
    'summon',
    'destroy',
    'activate',
    'battle',
    'damage',
    'shuffle',
    'discard',
]);

/**
 * Mots extraits du nom de carte trop **fréquents** en Yu-Gi-Oh ! pour créer un angle
 * « citation texte (mot du nom) » — sinon des milliers de faux positifs (ex. *dragon*, *white*).
 * Ne s’applique pas aux archétypes structurés (`archetype` API), seulement aux règles `text_name:*`.
 */
const NAME_WORD_YGO_GENERIC_BLOCKLIST = new Set([
    // Types / races (EN) — longueur ≥ minNameWordLength (5) sauf exceptions
    'dragon',
    'warrior',
    'spellcaster',
    'machine',
    'beast',
    'fiend',
    'aqua',
    'pyro',
    'rock',
    'plant',
    'insect',
    'wyrm',
    'cyberse',
    'illusion',
    'psychic',
    'reptile',
    'serpent',
    'winged',
    'zombie',
    'dinosaur',
    'fairy',
    'beast-warrior',
    'divine-beast',
    // Adjectifs / termes trop génériques dans les textes de cartes
    'white',
    'black',
    'light',
    'dark',
    'red',
    'blue',
    'green',
    'gold',
    'silver',
    'ancient',
    'modern',
    'elemental',
    'hero',
    'knight',
    'magician',
    'soldier',
    'guardian',
    'master',
    'lord',
    'lady',
    'woman',
    'king',
    'queen',
    'prince',
    'princess',
    'sage',
    'witch',
    'wizard',
    'crystal',
    // FR (noms)
    'magicien',
    'magicienne',
    'guerrier',
    'guerrière',
    'bete',
    'tenebreux',
    'lumineux',
    'ancien',
    'ancienne',
    'noir',
    'noire',
    'blanc',
    'blanche',
    'rouge',
    'bleu',
    'bleue',
    'vert',
    'verte',
    'serviteur',
    'chevalier',
]);

function stripCombiningMarks(s: string): string {
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function slugKey(prefix: string, s: string): string {
    const slug = stripCombiningMarks(s)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
    return `${prefix}:${slug || 'x'}`;
}

/** Variantes simples d’une phrase (espaces / tirets) pour matcher les `desc`. */
export function expandPhrasePatterns(phrase: string): string[] {
    const t = phrase.trim();
    if (t.length < 2) return [];
    const lower = t.toLowerCase();
    const out = new Set<string>();
    out.add(lower);
    if (lower.includes('-')) {
        out.add(lower.replace(/-/g, ' ').replace(/\s+/g, ' ').trim());
    }
    if (lower.includes(' ')) {
        out.add(lower.replace(/\s+/g, '-'));
    }
    return [...out].filter((p) => p.length >= 2);
}

function extractNameWords(
    anchor: AssociationCatalogCard,
    minLen: number,
): string[] {
    const seen = new Set<string>();
    const order: string[] = [];
    const sources = [anchor.name_en, anchor.name].filter((s): s is string => typeof s === 'string' && s.trim().length > 0);
    for (const n of sources) {
        const parts = n.split(/[\s/|–—\-]+/u);
        for (const raw of parts) {
            const w = stripCombiningMarks(
                raw
                    .replace(/^[^a-zA-ZÀ-ÿ0-9]+/u, '')
                    .replace(/[^a-zA-ZÀ-ÿ0-9]+$/u, '')
                    .toLowerCase(),
            );
            if (w.length < minLen) continue;
            if (STOP_WORDS.has(w)) continue;
            if (NAME_WORD_YGO_GENERIC_BLOCKLIST.has(w)) continue;
            if (!/[a-zà-ÿ]/i.test(w)) continue;
            if (!seen.has(w)) {
                seen.add(w);
                order.push(w);
            }
        }
    }
    return order;
}

/**
 * Construit des règles `text_mention` à partir de l’ancre :
 * - une règle par archétype parsé (patterns = variantes de la chaîne) ;
 * - optionnellement une règle par mot « significatif » du nom EN puis FR.
 */
export function buildDynamicTextMentionRulesFromAnchor(
    anchor: AssociationCatalogCard,
    options: DynamicTextMentionOptions = {},
): TextMentionRule[] {
    const includeName = options.includeNameWordPatterns ?? true;
    const minLen = options.minNameWordLength ?? 5;
    const rules: TextMentionRule[] = [];
    const usedKeys = new Set<string>();

    for (const arch of parseArchetypesFromField(anchor.archetype ?? undefined)) {
        const label = arch.trim();
        if (label.length < 2) continue;
        const patterns = expandPhrasePatterns(label);
        if (patterns.length === 0) continue;
        const key = slugKey('text_arch', label);
        if (usedKeys.has(key)) continue;
        usedKeys.add(key);
        rules.push({
            groupKey: key,
            displayLabel: `Citation texte : ${label}`,
            patterns,
        });
    }

    if (includeName) {
        for (const w of extractNameWords(anchor, minLen)) {
            const key = slugKey('text_name', w);
            if (usedKeys.has(key)) continue;
            // Éviter de dupliquer une règle déjà couverte par un archétype identique
            const dupArch = rules.some(
                (r) => r.groupKey.startsWith('text_arch:') && r.patterns.some((p) => p === w || p.replace(/\s/g, '-') === w),
            );
            if (dupArch) continue;
            usedKeys.add(key);
            rules.push({
                groupKey: key,
                displayLabel: `Citation texte (mot du nom) : « ${w} »`,
                patterns: [w],
            });
        }
    }

    return rules;
}
