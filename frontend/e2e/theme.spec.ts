import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
mkdirSync('../.local/screenshots', { recursive: true });
test.use({ actionTimeout: 15000 });
async function login(page: Page, username: string) {
  await page.goto('/login');
  await page.getByLabel('Tên đăng nhập').fill(username);
  await page.getByLabel('Mật khẩu').fill(process.env.DEMO_PASSWORD!);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Danh mục sách', exact: true })).toBeVisible();
}
test('public home, centered login and reader navbar remain responsive', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/home');
  await expect(
    page.getByRole('heading', { name: 'Mở trang sách. Mở rộng tri thức.' }),
  ).toBeVisible();
  await page.screenshot({ path: '../.local/screenshots/home-navy.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole('button', { name: 'Tra cứu sách', exact: true })).toBeVisible();
  await page.screenshot({ path: '../.local/screenshots/home-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByLabel('Tìm theo tên sách, tác giả hoặc ISBN').fill('Cấu trúc');
  await page.getByRole('button', { name: 'Tra cứu sách', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.screenshot({ path: '../.local/screenshots/login-navy.png', fullPage: true });
  await page.getByLabel('Tên đăng nhập').fill('student');
  await page.getByLabel('Mật khẩu').fill(process.env.DEMO_PASSWORD!);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.locator('.book-card')).toHaveCount(1);
  await expect(page.getByLabel('Tìm kiếm sách')).toHaveValue('Cấu trúc');
  await page.screenshot({ path: '../.local/screenshots/reader-navy.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Mở menu' }).click();
  await expect(page.getByRole('link', { name: 'Đang mượn', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Đóng menu' }).click();
  await expect(page.getByRole('button', { name: 'Mở menu' })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator('#public-menu')).not.toBeVisible();
  await page.screenshot({ path: '../.local/screenshots/reader-mobile-navy.png', fullPage: true });
  await page.goto('/dashboard');
  await expect(page).toHaveURL('http://127.0.0.1:5173/');
});
for (const username of ['admin', 'librarian'])
  test(username + ' dashboard uses authorized API data and keyboard drawer', async ({ page }) => {
    const denied: string[] = [];
    page.on('response', (r) => {
      if (r.url().includes('/api/') && r.status() === 403) denied.push(r.url());
    });
    await login(page, username);
    await page.goto('/dashboard');
    await expect(page.locator('.stat-card')).toHaveCount(4);
    const books = await (await page.request.get('/api/books?size=1')).json();
    await expect(
      page.locator('.stat-card').filter({ hasText: 'Đầu sách' }).locator('strong'),
    ).toHaveText(books.totalElements.toLocaleString('vi-VN'));
    if (username === 'admin')
      await expect(page.getByRole('link', { name: 'Lập phiếu & nhận trả' })).toHaveCount(0);
    else await expect(page.getByRole('link', { name: 'Xem báo cáo', exact: true })).toHaveCount(0);
    await page.screenshot({
      path: '../.local/screenshots/' + username + '-dashboard-navy.png',
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    const toggle = page.getByRole('button', { name: 'Mở menu' });
    await toggle.click();
    await expect(page.locator('.offcanvas.show')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.offcanvas.show')).toHaveCount(0);
    await expect(toggle).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: '../.local/screenshots/' + username + '-mobile-navy.png',
      fullPage: true,
    });
    expect(denied).toEqual([]);
  });
