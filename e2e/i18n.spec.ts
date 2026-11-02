import { test, expect } from '@playwright/test';

test.describe('Internationalization (i18n) - English Detection', () => {
  test.use({ locale: 'en-US' });

  test('Auto-detects English when browser language is en', async ({ page }) => {
    await page.goto('/');

    // Check English default strings
    await expect(page.getByText('100% Zero-Server Guarantee & GDPR Compliant')).toBeVisible();
    await expect(page.getByText('Drag and drop your files here')).toBeVisible();
    await expect(page.getByText('Anonymization Rules & Settings')).toBeVisible();
  });
});

test.describe('Internationalization (i18n) - Language Switcher & Persistence', () => {
  test('Allows switching language to French, Spanish, German and persists in localStorage', async ({ page }) => {
    await page.goto('/');

    // 1. Switch to French
    await page.locator('button[title*="Changer de langue"]').click();
    await page.getByRole('button', { name: /Français/i }).click();

    await expect(page.getByText('Garantie 100% Zero-Server & Conforme RGPD')).toBeVisible();
    await expect(page.getByText('Glissez-déposez vos fichiers ici')).toBeVisible();
    await expect(page.getByText("Paramètres & Règles d'Anonymisation")).toBeVisible();

    // Verify localStorage has 'fr'
    const savedLangFr = await page.evaluate(() => localStorage.getItem('safeface_language'));
    expect(savedLangFr).toBe('fr');

    // 2. Switch to Spanish
    await page.locator('button[title*="Changer de langue"]').click();
    await page.getByRole('button', { name: /Español/i }).click();

    await expect(page.getByText('Garantía 100% Zero-Server y Conforme RGPD')).toBeVisible();
    await expect(page.getByText('Arrastre y suelte sus archivos aquí')).toBeVisible();
    await expect(page.getByText('Reglas y Ajustes de Anonimización')).toBeVisible();

    // 3. Switch to German
    await page.locator('button[title*="Changer de langue"]').click();
    await page.getByRole('button', { name: /Deutsch/i }).click();

    await expect(page.getByText('100% Zero-Server Garantie & DSGVO-konform')).toBeVisible();
    await expect(page.getByText('Dateien hierher ziehen und ablegen')).toBeVisible();
    await expect(page.getByText('Anonymisierungsregeln & Einstellungen')).toBeVisible();

    // 4. Reload page and check persistence
    await page.reload();
    await expect(page.getByText('100% Zero-Server Garantie & DSGVO-konform')).toBeVisible();
  });
});
