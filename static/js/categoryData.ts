/**
 * Données métier des catégories deck (groupes + liste déroulante).
 * Séparé de `category.ts` (logique DOM du sélecteur).
 */

export const CATEGORY_GROUPS: Record<string, string[]> = {
    'Core Access': ['Starter', 'Extender', 'Consistency'],
    Disruption: ['Interruption', 'Hand Trap'],
    'Board Reset': ['Board Breaker', 'Floodgate'],
    'Win Setup': ['Wincon', 'Time', 'Brick'],
};

export const categoryOptions: string[] = [
    'Starter',
    'Extender',
    'Board Breaker',
    'Floodgate',
    'Hand Trap',
    'Wincon',
    'Time',
    'Brick',
    'Consistency',
    'Interruption',
    'Going First',
    'Going Second',
];
