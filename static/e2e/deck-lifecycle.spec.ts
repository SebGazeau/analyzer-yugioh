import { test, expect } from '@playwright/test';
import { E2E_DECK_GRID } from './deckDomSelectors.js';

test.describe('Deck lifecycle', () => {
    test('page loads and shows deck zones (Main / Extra / Side)', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveTitle(/deck|analyzer/i);
        await expect(page.locator(E2E_DECK_GRID.main)).toBeVisible({ timeout: 10_000 });
        await expect(page.locator('[data-deck-zone="main"]')).toBeVisible();
    });

    test('Mes decks panel or empty state visible', async ({ page }) => {
        await page.goto('/');
        await page.getByRole('tab', { name: 'DECKS' }).click();
        await expect(page.locator('.deck-saved-list-wrap')).toBeVisible({ timeout: 10_000 });
        await expect(page.locator('#btn-refresh-decks')).toBeVisible();
    });
});
