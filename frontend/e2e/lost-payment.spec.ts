import { test, expect, type Page } from '@playwright/test';

test.use({ actionTimeout: 15000 });

async function post(page: Page, path: string, data: unknown) {
  const tokenResponse = await page.request.get('/api/auth/csrf');
  expect(tokenResponse.ok()).toBeTruthy();
  const csrf = await tokenResponse.json();
  const response = await page.request.post('/api' + path, {
    headers: { [csrf.headerName]: csrf.token },
    data,
  });
  expect(response.ok(), 'POST ' + path + ' status ' + response.status()).toBeTruthy();
  const body = await response.text();
  return body ? JSON.parse(body) : null;
}

test('lost book closure and partial payments through the UI', async ({ page }) => {
  test.setTimeout(90000);
  const password = process.env.DEMO_PASSWORD;
  if (!password) throw new Error('Set DEMO_PASSWORD before running browser tests.');
  const suffix = Date.now().toString();
  // API prepares isolated fixtures; loss, closure and payments use the UI.
  await post(page, '/auth/login', { username: 'admin', password });
  const reader = await post(page, '/users', {
    username: 'e2e_lost_' + suffix,
    password: 'Fixture-' + suffix + '!',
    fullName: 'Bạn đọc vị trí E2E ' + suffix,
    email: 'location-' + suffix + '@library.test',
    phoneNumber: '',
    role: 'READER',
    readerCode: 'LOST-' + suffix,
    readerType: 'STUDENT',
  });
  await post(page, '/auth/logout', {});
  await post(page, '/auth/login', { username: 'librarian', password });
  const category = await post(page, '/categories', {
    name: 'Vị trí E2E ' + suffix,
    description: 'Dữ liệu kiểm thử',
  });
  const book = await post(page, '/books', {
    title: 'Vị trí cuốn E2E ' + suffix,
    author: 'Nhóm kiểm thử',
    isbn: 'LOST-ISBN-' + suffix,
    publisher: 'Demo',
    publicationYear: 2026,
    categoryId: category.id,
    description: 'Dữ liệu mô phỏng',
  });
  const barcode = 'LOST-ITEM-' + suffix;
  await post(page, '/books/' + book.id + '/items', [{ barcode, location: 'Kệ E2E' }]);
  const loan = await post(page, '/loans', {
    readerId: reader.id,
    barcodes: [barcode],
    note: 'Kiểm thử giao diện báo mất và thu phí',
  });
  page.on('dialog', (dialog) => dialog.accept());
  await page.goto('/loans');
  await page.getByLabel('Lọc theo ID bạn đọc').fill(String(reader.id));
  const detail = page.locator('.loan-detail').filter({ hasText: barcode });
  await detail.getByRole('button', { name: 'Báo mất', exact: true }).click();
  const modal = page.getByRole('dialog');
  await modal.getByLabel('Phí mất sách (VND)').fill('10000');
  await modal.getByLabel('Lý do xác định phí').fill('Phí mô phỏng E2E mất sách');
  await modal.getByRole('button', { name: 'Ghi nhận mất sách' }).click();
  await expect(modal).toHaveCount(0);
  await expect(detail.getByRole('button', { name: 'Nhận trả', exact: true })).toHaveCount(0);
  await expect(detail.getByRole('button', { name: 'Báo mất', exact: true })).toHaveCount(0);
  await expect(detail.getByText('Chưa đóng nghĩa vụ mượn')).toBeVisible();
  await page.goto('/violations');
  await page.getByLabel('Lọc theo ID bạn đọc').fill(String(reader.id));
  const row = page.locator('tbody tr').filter({ hasText: book.title });
  await row.getByRole('button', { name: 'Đóng nghĩa vụ mất' }).click();
  await modal
    .getByLabel('Căn cứ / lý do đóng nghĩa vụ')
    .fill('Đóng nghĩa vụ mô phỏng để kiểm tra thu phí');
  await modal.getByRole('button', { name: 'Xác nhận đóng nghĩa vụ' }).click();
  await expect(modal).toHaveCount(0);
  await expect(row.getByRole('button', { name: 'Đóng nghĩa vụ mất' })).toHaveCount(0);
  await expect(row.getByText('Đã đóng nghĩa vụ mượn')).toBeVisible();
  await page.reload();
  await page.getByLabel('Lọc theo ID bạn đọc').fill(String(reader.id));
  await expect(row.getByRole('button', { name: 'Đóng nghĩa vụ mất' })).toHaveCount(0);
  const receipt = await (await page.request.get('/api/loans/' + loan.id)).json();
  expect(receipt.status).toBe('RETURNED');
  expect(receipt.details[0].returnedAt).toBeNull();
  expect(receipt.details[0].closedAt).not.toBeNull();
  async function debt() {
    return Number(
      (await (await page.request.get('/api/violations/debt/' + reader.id)).json())
        .outstandingAmount,
    );
  }
  expect(await debt()).toBe(10000);
  await row.getByRole('button', { name: 'Thu phí', exact: true }).click();
  await modal.getByLabel('Số tiền thực thu (VND)').fill('10001');
  await modal.getByRole('button', { name: 'Ghi nhận đã thu tiền' }).click();
  await expect(modal.getByRole('alert')).toContainText('Số tiền thu vượt số còn nợ');
  expect(await debt()).toBe(10000);
  await modal.getByLabel('Số tiền thực thu (VND)').fill('4000');
  await modal.getByRole('button', { name: 'Ghi nhận đã thu tiền' }).click();
  await expect(modal).toHaveCount(0);
  expect(await debt()).toBe(6000);
  await row.getByRole('button', { name: 'Đã xử lý', exact: true }).click();
  await expect(row.getByRole('button', { name: 'Đã xử lý', exact: true })).toHaveCount(0);
  expect(await debt()).toBe(6000);
  await row.getByRole('button', { name: 'Thu phí', exact: true }).click();
  await expect(modal.getByLabel('Số tiền thực thu (VND)')).toHaveValue('6000');
  await modal.getByRole('button', { name: 'Ghi nhận đã thu tiền' }).click();
  await expect(modal).toHaveCount(0);
  expect(await debt()).toBe(0);
  await expect(row.getByRole('button', { name: 'Thu phí', exact: true })).toHaveCount(0);
  await row.getByRole('button', { name: 'Lịch sử thu' }).click();
  await expect(modal.locator('.list-row')).toHaveCount(2);
  const items = await (await page.request.get('/api/books/' + book.id + '/items')).json();
  expect(items[0].status).toBe('LOST');
});
