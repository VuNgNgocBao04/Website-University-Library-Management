import { test, expect } from '@playwright/test';

test.use({ actionTimeout: 15000 });

test('catalog persistence, category deletion guard and withdrawn copy editing', async ({
  page,
}) => {
  test.setTimeout(120000);
  const password = process.env.DEMO_PASSWORD;
  if (!password) throw new Error('Set DEMO_PASSWORD before running browser tests.');
  const suffix = Date.now().toString();
  const category = 'Thể loại E2E ' + suffix;
  const title = 'Danh mục E2E ' + suffix;
  const barcode = 'CAT-E2E-' + suffix;
  page.on('dialog', (dialog) => dialog.accept());
  await page.goto('/login');
  await page.getByLabel('Tên đăng nhập').fill('librarian');
  await page.getByLabel('Mật khẩu').fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Danh mục sách', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Thể loại' }).click();
  await page.getByRole('button', { name: 'Thêm thể loại' }).click();
  const modal = page.getByRole('dialog');
  await modal.getByLabel('Tên thể loại').fill(category);
  await modal.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await expect(modal).toHaveCount(0);
  await expect(page.getByRole('heading', { name: category, exact: true })).toBeVisible();
  await page.goto('/');
  await page.getByRole('button', { name: 'Thêm đầu sách' }).click();
  await modal.getByLabel('Tên sách').fill(title);
  await modal.getByLabel('Tác giả').fill('Nhóm kiểm thử');
  await modal.getByLabel('ISBN').fill('CAT-ISBN-' + suffix);
  await modal.getByLabel('Năm xuất bản').fill('2026');
  await modal.getByLabel('Thể loại').selectOption({ label: category });
  await modal.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await expect(modal).toHaveCount(0);
  await page.getByLabel('Tìm kiếm sách').fill(title);
  await page.locator('.book-card').click();
  const bookUrl = page.url();
  // A real PNG created in memory; no external image download or fixture file is needed.
  const cover = await page.screenshot({ clip: { x: 0, y: 0, width: 32, height: 32 } });
  const coverInput = page.getByLabel('Ảnh bìa PNG/JPEG');
  await coverInput.setInputFiles({ name: 'cover.png', mimeType: 'image/png', buffer: cover });
  await page.getByRole('button', { name: 'Tải ảnh bìa', exact: true }).click();
  const image = page.locator('.detail-cover img');
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBe(32);
  const savedCover = await image.getAttribute('src');
  expect(savedCover).toMatch(/^\/api\/covers\/[a-f0-9-]+\.png$/);
  await page.reload();
  await expect(image).toHaveAttribute('src', savedCover!);
  await expect.poll(() => image.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBe(32);
  await coverInput.setInputFiles({
    name: 'fake.png',
    mimeType: 'image/png',
    buffer: Buffer.from('not an image'),
  });
  await page.getByRole('button', { name: 'Tải ảnh bìa', exact: true }).click();
  await expect(page.locator('main').getByRole('alert')).toContainText('Tệp không phải ảnh hợp lệ.');
  await page.reload();
  await expect(image).toHaveAttribute('src', savedCover!);
  await coverInput.setInputFiles({
    name: 'large.png',
    mimeType: 'image/png',
    buffer: Buffer.alloc(6 * 1024 * 1024),
  });
  await page.getByRole('button', { name: 'Tải ảnh bìa', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Ảnh tối đa 5 MB.');
  await page.reload();
  await expect(image).toHaveAttribute('src', savedCover!);
  await page.getByRole('button', { name: 'Thêm cuốn' }).click();
  await modal.getByLabel('Mã vạch (mỗi dòng một mã)').fill(barcode);
  await modal.getByLabel('Vị trí trên kệ').fill('Kệ E2E');
  await modal.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await expect(modal).toHaveCount(0);
  const row = page.locator('tbody tr').filter({ hasText: barcode });
  await expect(row).toContainText('Kệ E2E');
  await row.getByRole('button', { name: 'Sửa', exact: true }).click();
  await modal.getByLabel('Tình trạng').selectOption('DAMAGED');
  await modal.getByLabel('Vị trí').fill('Kệ sửa chữa');
  await modal.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await expect(modal).toHaveCount(0);
  await page.reload();
  await expect(row).toContainText('Kệ sửa chữa');
  await row.getByRole('button', { name: 'Thanh lý', exact: true }).click();
  await expect
    .poll(async () => {
      const response = await page.request.get(bookUrl.replace('/books/', '/api/books/') + '/items');
      return (await response.json()).find((item: { barcode: string }) => item.barcode === barcode)
        ?.status;
    })
    .toBe('WITHDRAWN');
  await page.reload();
  await row.getByRole('button', { name: 'Sửa', exact: true }).click();
  await expect(modal.getByLabel('Tình trạng')).toHaveCount(0);
  await expect(modal.getByText('Tình trạng được giữ nguyên.', { exact: false })).toBeVisible();
  await modal.getByLabel('Vị trí').fill('Kho thanh lý');
  await modal.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await expect(modal).toHaveCount(0);
  await page.reload();
  await expect(row).toContainText('Kho thanh lý');
  const itemsResponse = await page.request.get(
    bookUrl.replace('/books/', '/api/books/') + '/items',
  );
  const item = (await itemsResponse.json()).find(
    (entry: { barcode: string }) => entry.barcode === barcode,
  );
  expect(item.status).toBe('WITHDRAWN');
  expect(item.condition).toBe('DAMAGED');
  await page.getByRole('link', { name: 'Thể loại' }).click();
  const categoryRow = page.locator('.list-row').filter({ hasText: category });
  await categoryRow.getByRole('button', { name: 'Xóa', exact: true }).click();
  await expect(categoryRow.getByRole('alert')).toContainText('Thể loại đang được sử dụng.');
  await page.reload();
  await expect(page.getByRole('heading', { name: category, exact: true })).toBeVisible();
});
