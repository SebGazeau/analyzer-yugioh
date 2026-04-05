import { test, expect } from '@playwright/test';
import { E2E_DECK_GRID } from './deckDomSelectors.js';

test.describe('Recherche et locale', () => {
    test('une requête /search inclut locale=fr quand html lang est fr', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator(E2E_DECK_GRID.main)).toBeVisible({ timeout: 15_000 });

        await page.evaluate(() => {
            document.documentElement.lang = 'fr';
        });

        const reqPromise = page.waitForRequest(
            (req) => {
                const u = req.url();
                return u.includes('/search?') && u.includes('q=') && u.includes('locale=fr');
            },
            { timeout: 12_000 },
        );

        const box = page.locator('#search-box');
        await expect(box).toBeVisible();
        await box.fill('abcd');

        const req = await reqPromise;
        expect(req.url()).toContain('locale=fr');
    });
});
