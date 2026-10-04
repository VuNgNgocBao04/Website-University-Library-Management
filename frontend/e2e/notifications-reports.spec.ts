import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test.use({ actionTimeout: 15000 });
async function login(page: Page, username: string) {
  const password = process.env.DEMO_PASSWORD;
  if (!password) throw new Error('Set DEMO_PASSWORD before running browser tests.');
  await page.goto('/login');
  await page.getByLabel('Tên đăng nhập').fill(username);
  await page.getByLabel('Mật khẩu').fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Danh mục sách', exact: true })).toBeVisible();
}

test('reader notification read-all persists and reports stay forbidden', async ({ page }) => {
  await login(page, 'student');
  await page.getByRole('link', { name: 'Thông báo' }).click();
  await expect(page.getByRole('heading', { name: 'Thông báo', exact: true })).toBeVisible();
  const before = await (await page.request.get('/api/notifications')).json();
  expect(before.totalElements).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Đánh dấu tất cả đã đọc' }).click();
  await expect(page.getByText('0 thông báo chưa đọc', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('0 thông báo chưa đọc', { exact: true })).toBeVisible();
  await expect(page.locator('.notice.unread')).toHaveCount(0);
  const after = await (await page.request.get('/api/notifications')).json();
  expect(after.totalElements).toBe(before.totalElements);
  expect(after.content.every((notice: { readAt: string | null }) => notice.readAt !== null)).toBe(
    true,
  );
  expect((await page.request.get('/api/reports?from=2000-01-01&to=2000-01-02')).status()).toBe(403);
  await page.goto('/reports');
  await expect(page).toHaveURL('http://127.0.0.1:5173/');
});

test('report date filter and exports use the applied period', async ({ page }) => {
  await login(page, 'admin');
  await page.getByRole('link', { name: 'Báo cáo' }).click();
  await page.getByLabel('Từ ngày').fill('2000-01-01');
  await page.getByLabel('Đến hết ngày').fill('2000-01-02');
  const result = page.waitForResponse(
    (r) =>
      r.url().includes('/api/reports?from=2000-01-01&to=2000-01-02') &&
      r.request().method() === 'GET',
  );
  await page.getByRole('button', { name: 'Xem báo cáo', exact: true }).click();
  const response = await result;
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  expect(data.borrowing.receipts).toBe(0);
  expect(data.borrowing.bookLoans).toBe(0);
  await expect(
    page.locator('.metric').filter({ hasText: 'Phiếu mượn' }).locator('strong'),
  ).toHaveText('0');
  await expect(page.getByText('Chưa có lượt mượn trong kỳ.', { exact: true })).toBeVisible();
  for (const format of ['CSV', 'PDF']) {
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Xuất ' + format, exact: true }).click();
    const download = await pending;
    expect(await download.failure()).toBeNull();
    const bytes = await readFile((await download.path())!);
    if (format === 'CSV') expect(bytes.subarray(0, 3).toString('hex')).toBe('efbbbf');
    else expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
  }
});
