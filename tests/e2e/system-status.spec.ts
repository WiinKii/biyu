import { expect, test } from '@playwright/test';

test.describe('Estado del sistema (fase 0)', () => {
  test('la PWA servida como Static Assets consulta la API y D1 locales', async ({ page }) => {
    const problems: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') problems.push(message.text());
    });
    page.on('pageerror', (error) => problems.push(error.message));

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Biyu', level: 1 })).toBeVisible();

    const rows = page.getByTestId('status-rows');
    await expect(rows.getByText('Servicio de Biyu')).toBeVisible();
    await expect(rows.locator('li').nth(0)).toContainText('Disponible');
    await expect(rows.locator('li').nth(1)).toContainText('Base de datos');
    await expect(rows.locator('li').nth(1)).toContainText('Disponible');
    await expect(page.getByTestId('checked-at')).toContainText('hora de Caracas');

    // Honest scope: the screen states that nothing can be registered yet.
    await expect(
      page.getByText('Biyu todavía no registra operaciones.', { exact: false }),
    ).toBeVisible();

    // No CSP violations or runtime errors.
    expect(problems).toEqual([]);
  });

  test('las respuestas HTML llevan las cabeceras de seguridad', async ({ request }) => {
    const response = await request.get('/');
    expect(response.status()).toBe(200);
    const csp = response.headers()['content-security-policy'] ?? '';
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(response.headers()['x-content-type-options']).toBe('nosniff');
  });

  test('una ruta desconocida de la PWA vuelve al inicio (SPA)', async ({ page }) => {
    await page.goto('/ruta-inexistente');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: 'Estado del sistema' })).toBeVisible();
  });

  test('una ruta desconocida de la API responde con el formato de error', async ({ request }) => {
    const response = await request.get('/api/v1/no-existe');
    expect(response.status()).toBe(404);
    const body = (await response.json()) as { error: { code: string; request_id: string } };
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.request_id).toBe(response.headers()['x-request-id']);
  });

  test('sin conexión muestra el estado real y se recupera al volver', async ({ page, context }) => {
    await page.goto('/');
    const firstRow = page.getByTestId('status-rows').locator('li').nth(0);
    await expect(firstRow).toContainText('Disponible');

    await context.setOffline(true);
    await expect(firstRow).toContainText('Sin conexión');

    await context.setOffline(false);
    await expect(firstRow).toContainText('Disponible');
  });

  test('sin desplazamiento horizontal y con foco visible por teclado', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('status-rows').locator('li').nth(0)).toContainText('Disponible');

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    const retry = page.getByRole('button', { name: 'Volver a comprobar' });
    await expect(retry).toBeVisible();
    const box = await retry.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);

    await page.keyboard.press('Tab');
    const focusedName = await page.evaluate(() => document.activeElement?.textContent.trim() ?? '');
    expect(focusedName).toContain('Volver a comprobar');
  });

  test('captura para QA visual', async ({ page }, testInfo) => {
    await page.goto('/');
    await expect(page.getByTestId('status-rows').locator('li').nth(1)).toContainText('Disponible');
    await page.screenshot({ path: testInfo.outputPath('system-status.png'), fullPage: true });
  });
});
