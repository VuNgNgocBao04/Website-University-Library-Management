import { test, expect, type Page } from '@playwright/test';

test.use({ actionTimeout: 15000 });

const password = process.env.DEMO_PASSWORD;
if (!password) throw new Error('Set DEMO_PASSWORD before running browser tests.');

async function login(page: Page, username: string, secret = password!) {
  await page.goto('/login');
  await page.getByLabel('Tên đăng nhập').fill(username);
  await page.getByLabel('Mật khẩu').fill(secret);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login$/);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Danh mục sách', exact: true })).toBeVisible();
}

test('account lifecycle, profile, password and revocation across browser sessions', async ({
  page,
  browser,
}) => {
  test.setTimeout(120000);
  const suffix = Date.now().toString();
  const accountPassword = 'Account-' + suffix + '!';
  const username = 'e2e_user_' + suffix;
  const readerContext = await browser.newContext({ baseURL: 'http://127.0.0.1:5173' });
  const reader = await readerContext.newPage();
  page.on('dialog', (dialog) => dialog.accept());
  try {
    await login(page, 'admin');
    await page.getByRole('link', { name: 'Tài khoản', exact: false }).click();
    await page.getByRole('button', { name: 'Tạo tài khoản', exact: false }).click();
    const modal = page.getByRole('dialog');
    await modal.getByLabel('Tên đăng nhập').fill(username);
    await modal.getByLabel('Mật khẩu ban đầu').fill(accountPassword);
    await modal.getByLabel('Họ tên').fill('Bạn đọc kiểm thử ' + suffix);
    await modal.getByLabel('Email').fill(username + '@library.test');
    await modal.getByLabel('Vai trò').selectOption('READER');
    await modal.getByLabel('Mã bạn đọc').fill('E2E-' + suffix);
    await modal.getByLabel('Loại bạn đọc').selectOption('STUDENT');
    await modal.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
    await expect(modal).toHaveCount(0);
    await page.getByLabel('Tìm tên hoặc tài khoản').fill(username);
    const row = page.locator('tbody tr').filter({ hasText: username });
    await expect(row).toHaveCount(1);
    const identity = await row.locator('td').first().innerText();
    const userId = identity.match(/#(\d+)/)![1];

    await row.getByRole('button', { name: 'Sửa', exact: true }).click();
    await modal.getByLabel('Họ tên').fill('Hồ sơ đã cập nhật ' + suffix);
    await modal.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
    await expect(row).toContainText('Hồ sơ đã cập nhật');

    await login(reader, username, accountPassword);
    await expect(reader.getByRole('link', { name: 'Tài khoản', exact: false })).toHaveCount(0);
    await reader.goto('/accounts');
    await expect(reader).toHaveURL('http://127.0.0.1:5173/');
    expect((await reader.request.get('http://127.0.0.1:5173/api/users')).status()).toBe(403);
    await reader.goto('/profile');
    await reader.getByLabel('Số điện thoại').fill('0901234567');
    await reader.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
    await expect(reader.getByText('Đã cập nhật hồ sơ.', { exact: true })).toBeVisible();
    await reader.reload();
    await expect(reader.getByLabel('Số điện thoại')).toHaveValue('0901234567');

    await row.getByRole('button', { name: 'Khóa', exact: true }).click();
    await expect(row.getByRole('button', { name: 'Mở', exact: true })).toBeVisible();
    await reader.goto('/');
    await expect(reader).toHaveURL(/\/login$/);
    await reader.getByLabel('Tên đăng nhập').fill(username);
    await reader.getByLabel('Mật khẩu').fill(accountPassword);
    await reader.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await expect(reader.getByRole('alert')).toBeVisible();
    await expect(reader).toHaveURL(/\/login$/);
    await row.getByRole('button', { name: 'Mở', exact: true }).click();
    await expect(row.getByRole('button', { name: 'Khóa', exact: true })).toBeVisible();
    await login(reader, username, accountPassword);

    await row.getByRole('button', { name: 'Đổi quyền', exact: true }).click();
    await modal.getByLabel('Vai trò').selectOption('LIBRARIAN');
    await modal.getByLabel('Mã nhân viên').fill('NV-E2E-' + suffix);
    await modal.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
    await expect(modal).toHaveCount(0);
    await expect(row).toContainText('#' + userId + ' ·');
    await expect(row).toContainText('NV-E2E-' + suffix);
    await reader.goto('/');
    await expect(reader).toHaveURL(/\/login$/);
    await login(reader, username, accountPassword);
    await reader.getByRole('link', { name: 'Mượn & trả' }).click();
    await expect(
      reader.getByRole('button', { name: 'Lập phiếu mượn', exact: false }),
    ).toBeVisible();
    expect((await reader.request.get('http://127.0.0.1:5173/api/users')).status()).toBe(403);

    await reader.goto('/profile');
    const newPassword = 'Changed-' + suffix + '!';
    await reader.getByLabel('Mật khẩu hiện tại').fill(accountPassword);
    await reader.getByLabel('Mật khẩu mới').fill(newPassword);
    await reader.getByRole('button', { name: 'Đổi mật khẩu và đăng nhập lại' }).click();
    await expect(reader).toHaveURL(/\/login$/);
    await login(reader, username, newPassword);
    await row.getByRole('button', { name: 'Ngừng hoạt động', exact: true }).click();
    await expect(row.getByRole('button', { name: 'Mở', exact: true })).toBeVisible();
    await reader.goto('/');
    await expect(reader).toHaveURL(/\/login$/);
  } finally {
    await readerContext.close();
  }
});
