// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchCardByName } from '../api.js';

describe('api.ts', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('fetchCardByName returns null if fetch fails', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('', { status: 404 }) as any);
    const result = await fetchCardByName('foo');
    expect(result).toBeNull();
  });

  it('fetchCardByName returns null for empty or whitespace', async () => {
    expect(await fetchCardByName('')).toBeNull();
    expect(await fetchCardByName('   ')).toBeNull();
  });

  it('fetchCardByName returns card when /card?name= succeeds', async () => {
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const u = typeof input === 'string' ? input : input instanceof Request ? input.url : input.href;
      if (u.includes('/card?name=')) {
        return Promise.resolve(
          new Response(JSON.stringify({ id: 1, name: 'Dark Magician', type: 'Normal Monster' }), { status: 200 }),
        );
      }
      return Promise.resolve(new Response('[]', { status: 200 }));
    });
    const result = await fetchCardByName('Dark Magician');
    expect(result).not.toBeNull();
    expect(result?.name).toBe('Dark Magician');
  });

  it('fetchCardByName tries variant " & " -> " and " when exact fails', async () => {
    let callCount = 0;
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      callCount += 1;
      const u = typeof input === 'string' ? input : input instanceof Request ? input.url : input.href;
      if (u.includes('Ash%20Blossom%20%26%20Joyous')) return Promise.resolve(new Response('', { status: 404 }) as any);
      if (u.includes('Ash%20Blossom%20and%20Joyous')) {
        return Promise.resolve(
          new Response(JSON.stringify({ id: 2, name: 'Ash Blossom & Joyous Spring' }), { status: 200 }),
        );
      }
      return Promise.resolve(new Response('[]', { status: 200 }));
    });
    const result = await fetchCardByName('Ash Blossom & Joyous Spring');
    expect(result?.name).toBe('Ash Blossom & Joyous Spring');
    expect(callCount).toBeGreaterThanOrEqual(2);
  });

  it('fetchCardByName falls back to /search when length >= 4 and no exact match', async () => {
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const u = typeof input === 'string' ? input : input instanceof Request ? input.url : input.href;
      if (u.startsWith('/card?')) return Promise.resolve(new Response('', { status: 404 }) as any);
      if (u.startsWith('/search?')) {
        return Promise.resolve(
          new Response(
            JSON.stringify([{ id: 3, name: 'Raigeki', name_en: 'Raigeki', type: 'Spell' }]),
            { status: 200 },
          ),
        );
      }
      return Promise.resolve(new Response('[]', { status: 200 }));
    });
    const result = await fetchCardByName('Raigeki');
    expect(result?.name).toBe('Raigeki');
  });

  it('fetchCardByName returns null when /card returns invalid JSON (no card.name)', async () => {
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const u = typeof input === 'string' ? input : input instanceof Request ? input.url : input.href;
      if (u.includes('/card?')) {
        return Promise.resolve(new Response(JSON.stringify({ id: 1 }), { status: 200 })); // no name
      }
      return Promise.resolve(new Response('[]', { status: 200 }));
    });
    const result = await fetchCardByName('NoName');
    expect(result).toBeNull();
  });
}); 