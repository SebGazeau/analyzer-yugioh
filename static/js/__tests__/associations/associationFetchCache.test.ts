import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    getAssociationCatalog,
    getQaRelatedCardIds,
    resetAssociationFetchCache,
} from '../../associations/associationFetchCache.js';
import {
    ASSOCIATIONS_API_CATALOG_URL,
    associationsApiQaRelatedUrl,
} from '../../associations/associationsApiRoutes.js';

afterEach(() => {
    resetAssociationFetchCache();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('associationFetchCache', () => {
    it('ne refetch le catalogue qu’une fois par session', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => [
                {
                    id: 1,
                    name: 'A',
                    name_en: 'A',
                    archetype: null,
                    desc: null,
                },
            ],
        });
        vi.stubGlobal('fetch', fetchMock);

        const a = await getAssociationCatalog();
        const b = await getAssociationCatalog();

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(ASSOCIATIONS_API_CATALOG_URL);
        expect(a.length).toBe(1);
        expect(b).toBe(a);
    });

    it('dédoublonne les appels catalogue concurrents', async () => {
        let resolveJson!: (v: unknown[]) => void;
        const jsonPromise = new Promise<unknown[]>((r) => {
            resolveJson = r;
        });
        const fetchMock = vi.fn().mockImplementation(() =>
            Promise.resolve({
                ok: true,
                json: () => jsonPromise,
            }),
        );
        vi.stubGlobal('fetch', fetchMock);

        const p1 = getAssociationCatalog();
        const p2 = getAssociationCatalog();
        expect(fetchMock).toHaveBeenCalledTimes(1);
        resolveJson!([{ id: 2, name: 'B', name_en: null, archetype: null, desc: null }]);
        const [c1, c2] = await Promise.all([p1, p2]);
        expect(c1).toBe(c2);
    });

    it('met en cache qa_related par card_id', async () => {
        const fetchMock = vi
            .fn()
            .mockImplementation((url: string) => {
                if (url === ASSOCIATIONS_API_CATALOG_URL) {
                    return Promise.resolve({
                        ok: true,
                        json: async () => [{ id: 1, name: 'A', name_en: null, archetype: null, desc: null }],
                    });
                }
                if (url.startsWith(associationsApiQaRelatedUrl(7))) {
                    return Promise.resolve({ ok: true, json: async () => [10, 20] });
                }
                return Promise.resolve({ ok: false, json: async () => null });
            });
        vi.stubGlobal('fetch', fetchMock);

        await expect(getQaRelatedCardIds(7)).resolves.toEqual([10, 20]);
        await expect(getQaRelatedCardIds(7)).resolves.toEqual([10, 20]);
        expect(fetchMock.mock.calls.filter((c) => String(c[0]).includes('qa_related')).length).toBe(1);
    });

    it('vide le cache catalogue après reset (retry possible)', async () => {
        let n = 0;
        const fetchMock = vi.fn().mockImplementation(() => {
            n += 1;
            return Promise.resolve({
                ok: true,
                json: async () => [{ id: n, name: 'X', name_en: null, archetype: null, desc: null }],
            });
        });
        vi.stubGlobal('fetch', fetchMock);

        const first = await getAssociationCatalog();
        expect(first[0].id).toBe(1);
        resetAssociationFetchCache();
        const second = await getAssociationCatalog();
        expect(second[0].id).toBe(2);
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });
});
