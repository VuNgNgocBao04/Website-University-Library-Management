import { test, expect, type Page } from '@playwright/test';

test.use({ actionTimeout: 15000 });
async function login(page: Page) {
  if (!process.env.DEMO_PASSWORD) throw new Error('Set DEMO_PASSWORD.');
  await page.goto('/login');
  await page.getByLabel('Tên đăng nhập').fill('admin');
  await page.getByLabel('Mật khẩu').fill(process.env.DEMO_PASSWORD);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Danh mục sách', exact: true })).toBeVisible();
}

test('rule editor persists changes and restores the original local rule', async ({ page }) => {
  await login(page);
  const rules = await (await page.request.get('/api/rules')).json();
  const original = rules.find((r: { readerType: string }) => r.readerType === 'STUDENT');
  try {
    await page.goto('/rules');
    await page
      .locator('.rule-card')
      .filter({ hasText: 'Sinh viên' })
      .getByRole('button', { name: 'Chỉnh sửa quy định' })
      .click();
    const modal = page.getByRole('dialog');
    await modal.getByLabel('Số cuốn tối đa').fill('9');
    await modal.getByLabel('Số ngày mượn').fill('29');
    await modal.getByLabel('Phí trễ hạn / ngày (VND)').fill('2500');
    await modal.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expect(modal).toHaveCount(0);
    await page.reload();
    await page
      .locator('.rule-card')
      .filter({ hasText: 'Sinh viên' })
      .getByRole('button', { name: 'Chỉnh sửa quy định' })
      .click();
    await expect(modal.getByLabel('Số cuốn tối đa')).toHaveValue('9');
    await expect(modal.getByLabel('Số ngày mượn')).toHaveValue('29');
    await expect(modal.getByLabel('Phí trễ hạn / ngày (VND)')).toHaveValue('2500');
  } finally {
    const csrf = await (await page.request.get('/api/auth/csrf')).json();
    const response = await page.request.put('/api/rules/STUDENT', {
      headers: { [csrf.headerName]: csrf.token },
      data: {
        maxBooksAllowed: original.maxBooksAllowed,
        maxDaysAllowed: original.maxDaysAllowed,
        dailyFineAmount: original.dailyFineAmount,
      },
    });
    expect(response.ok()).toBeTruthy();
    const restored = await (await page.request.get('/api/rules')).json();
    expect(restored.find((r: { readerType: string }) => r.readerType === 'STUDENT')).toEqual(
      original,
    );
  }
});

test('direct multipart upload returns structured 413 without changing the cover', async ({
  page,
}) => {
  await login(page);
  const books = await (await page.request.get('/api/books?size=1')).json();
  const book = books.content[0];
  expect(book).toBeTruthy();
  const csrf = await (await page.request.get('/api/auth/csrf')).json();
  for (const size of [5.5, 6]) {
    const response = await page.request.post('/api/books/' + book.id + '/cover', {
      headers: { [csrf.headerName]: csrf.token },
      multipart: {
        file: {
          name: 'oversized.png',
          mimeType: 'image/png',
          buffer: Buffer.alloc(size * 1024 * 1024),
        },
      },
    });
    expect(response.status()).toBe(413);
    expect(await response.json()).toMatchObject({
      code: 'FILE_TOO_LARGE',
      message: 'Ảnh tối đa 5 MB.',
    });
  }
  const unchanged = await (await page.request.get('/api/books/' + book.id)).json();
  expect(unchanged.coverImageUrl).toBe(book.coverImageUrl);
});
