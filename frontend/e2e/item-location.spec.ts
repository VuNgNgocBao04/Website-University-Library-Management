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

test('editing location preserves active and lost loan obligations', async ({ page }) => {
  test.setTimeout(90000);
  const password = process.env.DEMO_PASSWORD;
  if (!password) throw new Error('Set DEMO_PASSWORD before running browser tests.');
  const suffix = Date.now().toString();
  // API setup uses the same session/CSRF protections; location changes use the UI.
  await post(page, '/auth/login', { username: 'admin', password });
  const reader = await post(page, '/users', {
    username: 'e2e_location_' + suffix,
    password: 'Fixture-' + suffix + '!',
    fullName: 'Bạn đọc vị trí E2E ' + suffix,
    email: 'location-' + suffix + '@library.test',
    phoneNumber: '',
    role: 'READER',
    readerCode: 'LOC-' + suffix,
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
    isbn: 'LOC-ISBN-' + suffix,
    publisher: 'Demo',
    publicationYear: 2026,
    categoryId: category.id,
    description: 'Dữ liệu mô phỏng',
  });
  const barcode = 'LOC-ITEM-' + suffix;
  await post(page, '/books/' + book.id + '/items', [{ barcode, location: 'Kệ E2E' }]);
  const loan = await post(page, '/loans', {
    readerId: reader.id,
    barcodes: [barcode],
    note: 'Kiểm thử vị trí',
  });
  let violationId: number | undefined;
  for (const status of ['ON_LOAN', 'LOST']) {
    if (status === 'LOST') {
      const violation = await post(page, '/violations', {
        borrowDetailId: loan.details[0].id,
        type: 'LOST',
        fineAmount: 10000,
        notes: 'Phí minh họa cho kịch bản kiểm thử vị trí cuốn mất',
      });
      violationId = violation.id;
    }
    const beforeResponse = await page.request.get('/api/loans/' + loan.id);
    expect(beforeResponse.ok()).toBeTruthy();
    const before = await beforeResponse.json();
    await page.goto('/books/' + book.id);
    const row = page.locator('tbody tr').filter({ hasText: barcode });
    await row.getByRole('button', { name: 'Sửa', exact: true }).click();
    const modal = page.getByRole('dialog');
    await expect(modal.getByLabel('Tình trạng')).toHaveCount(0);
    await expect(modal.getByText('Tình trạng được giữ nguyên.', { exact: false })).toBeVisible();
    const location = 'Vị trí kiểm kê ' + status;
    await modal.getByLabel('Vị trí').fill(location);
    await modal.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expect(modal).toHaveCount(0);
    await page.reload();
    await expect(row).toContainText(location);
    const items = await (await page.request.get('/api/books/' + book.id + '/items')).json();
    expect(items[0].status).toBe(status);
    expect(items[0].condition).toBe(status === 'LOST' ? 'LOST' : 'GOOD');
    const after = await (await page.request.get('/api/loans/' + loan.id)).json();
    expect(after.status).toBe('BORROWING');
    expect(after.details[0].returnedAt).toBeNull();
    expect(after.details[0].closedAt).toBeNull();
    expect(after.details[0].dueDate).toBe(before.details[0].dueDate);
    expect(after.details[0].fineRatePerDay).toBe(before.details[0].fineRatePerDay);
    expect(after.details[0].closureReason).toBe(before.details[0].closureReason);
  }
  // Close explicitly with an audit reason, never by changing the item's location.
  await post(page, '/violations/' + violationId + '/close-lost-loan', {
    reason: 'Hoàn tất kịch bản E2E vị trí; đóng nghĩa vụ mô phỏng',
  });
  const closed = await (await page.request.get('/api/loans/' + loan.id)).json();
  expect(closed.status).toBe('RETURNED');
  expect(closed.details[0].returnedAt).toBeNull();
  expect(closed.details[0].closedAt).not.toBeNull();
  const items = await (await page.request.get('/api/books/' + book.id + '/items')).json();
  expect(items[0].status).toBe('LOST');
});
