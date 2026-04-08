import type { SearchApiCard } from '../services/search/searchApiTypes.js';
import type { AssociationCatalogCard } from './types.js';

/** Adapte une entrée catalogue associations pour le rendu `searchCardPreview` (recherche builder). */
export function associationCatalogCardToSearchApiCard(c: AssociationCatalogCard): SearchApiCard {
    return {
        id: c.id,
        name: c.name,
        name_en: c.name_en ?? undefined,
        archetype: c.archetype,
        archetype_source: c.archetype_source,
        image_url: c.image_url,
        desc: c.desc,
    };
}
