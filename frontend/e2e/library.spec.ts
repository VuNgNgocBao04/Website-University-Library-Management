import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
mkdirSync('../.local/screenshots', { recursive: true });
const password = process.env.DEMO_PASSWORD;
if (!password) throw new Error('Set DEMO_PASSWORD before running browser tests.');
async function login(page: Page, username: string, secret = password!) {
  await page.goto('/login');
  await page.getByLabel('Tên đăng nhập').fill(username);
  await page.getByLabel('Mật khẩu').fill(secret);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Danh mục sách', exact: true })).toBeVisible();
}
test('reader catalog, ownership navigation and responsive layout', async ({ page }) => {
  await login(page, 'student');
  await page.getByLabel('Tìm kiếm sách').fill('Cấu trúc');
  await expect(page.locator('.book-card')).toHaveCount(1);
  await page.locator('.book-card').click();
  await expect(page.getByRole('heading', { name: 'Thông tin ấn bản' })).toBeVisible();
  await page.getByRole('link', { name: 'Đang mượn', exact: false }).first().click();
  await expect(page.getByRole('heading', { name: 'Sách đang mượn' })).toBeVisible();
  await page.getByRole('link', { name: 'Pre-Order' }).click();
  await expect(page.getByRole('heading', { name: 'Sắp phát triển' })).toBeVisible();
  await expect(page.locator('.main-content form')).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Mở menu' })).toBeVisible();
  await page.getByRole('button', { name: 'Mở menu' }).click();
  await expect(page.getByRole('button', { name: 'Đóng menu' })).toBeVisible();
  await page.getByRole('button', { name: 'Đóng menu' }).click();
  await expect(page.getByRole('button', { name: 'Mở menu' })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
test('librarian creates book and copy, lends, returns damaged, collects fee', async ({ page }) => {
  const suffix = Date.now().toString();
  const title = 'Giáo trình kiểm thử ' + suffix;
  const barcode = 'E2E-' + suffix;
  page.on('dialog', (dialog) => dialog.accept());
  await login(page, 'librarian');
  await page.getByRole('button', { name: 'Thêm đầu sách' }).click();
  await page.getByLabel('Tên sách').fill(title);
  await page.getByLabel('Tác giả').fill('Nhóm Project 1');
  await page.getByLabel('ISBN').fill('E2E-ISBN-' + suffix);
  await page.getByLabel('Năm xuất bản').fill('2026');
  await page.getByLabel('Thể loại').last().selectOption({ label: 'Công nghệ thông tin' });
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByLabel('Tìm kiếm sách').fill(title);
  await page.locator('.book-card').click();
  await page.getByRole('button', { name: 'Thêm cuốn' }).click();
  await page.getByLabel('Mã vạch (mỗi dòng một mã)').fill(barcode);
  await page.getByLabel('Vị trí trên kệ').fill('E2E / Kệ 1');
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await expect(page.getByRole('cell', { name: barcode, exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Mượn & trả' }).click();
  await page.getByRole('button', { name: 'Lập phiếu mượn' }).click();
  await page
    .getByLabel('Chọn bạn đọc')
    .selectOption({ label: 'SV001 · Sinh viên Trần Minh · ACTIVE' });
  await page.getByRole('button', { name: 'Kiểm tra hạn mức' }).click();
  await expect(page.getByText(/Hạn mượn 30 ngày/)).toBeVisible();
  await page.getByLabel('Mã vạch (mỗi dòng một mã)').fill(barcode);
  await page.getByRole('button', { name: 'Xác nhận giao sách' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const row = page.locator('.loan-detail').filter({ hasText: barcode });
  while (
    !(await row.count()) &&
    (await page.getByRole('button', { name: 'Sau', exact: true }).isEnabled())
  ) {
    const response = page.waitForResponse((r) => r.url().includes('/api/loans?') && r.ok());
    await page.getByRole('button', { name: 'Sau', exact: true }).click();
    await response;
    await expect(page.getByRole('status')).toHaveCount(0);
  }
  await row.getByRole('button', { name: 'Nhận trả', exact: true }).click();
  await page.getByLabel('Tình trạng khi trả').selectOption('DAMAGED');
  await page.getByLabel('Phí hỏng (VND)').fill('10000');
  await page.getByLabel('Lý do / ghi chú hỏng').fill('Rách bìa trong kịch bản kiểm thử');
  await page.getByRole('button', { name: 'Xác nhận nhận trả' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(row.getByText('Đã đóng phiếu')).toBeVisible();
  await page.getByRole('link', { name: 'Vi phạm & phí' }).click();
  const violation = page.locator('tbody tr').filter({ hasText: title });
  await violation.getByRole('button', { name: 'Thu phí', exact: true }).click();
  await page.getByRole('button', { name: 'Ghi nhận đã thu tiền' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(violation.getByRole('button', { name: 'Thu phí', exact: true })).toHaveCount(0);
  await violation.getByRole('button', { name: 'Lịch sử thu' }).click();
  await expect(page.getByRole('dialog').getByText('Thủ thư: Thủ thư Nguyễn An')).toBeVisible();
});
test('admin report and CSV/PDF download, no circulation mutation control', async ({ page }) => {
  await login(page, 'admin');
  await page.getByRole('link', { name: 'Mượn & trả' }).click();
  await expect(page.getByRole('button', { name: 'Lập phiếu mượn' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Nhận trả', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'Báo cáo', exact: false }).click();
  await expect(page.getByText('Số lượt', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Tiền thu trong kỳ', { exact: true })).toBeVisible();
  for (const format of ['CSV', 'PDF']) {
    const event = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Xuất ' + format }).click();
    const download = await event;
    expect(await download.failure()).toBeNull();
  }
});

test('password recovery sends SMTP email and one-time reset works', async ({ page, request }) => {
  const suffix = Date.now().toString();
  const username = 'e2e_reset_' + suffix;
  const address = username + '@library.test';
  const resetPassword = 'Reset-' + suffix + '!';
  await login(page, 'admin');
  const csrf = await (await page.request.get('/api/auth/csrf')).json();
  const created = await page.request.post('/api/users', {
    headers: { [csrf.headerName]: csrf.token },
    data: {
      username,
      password: resetPassword,
      fullName: 'Bạn đọc reset E2E',
      email: address,
      role: 'READER',
      readerCode: 'RESET-' + suffix,
      readerType: 'STUDENT',
    },
  });
  expect(created.ok()).toBeTruthy();
  await page.getByRole('button', { name: 'Đăng xuất' }).click();
  await page.goto('/forgot-password');
  await page.getByLabel('Email').fill(address);
  await page.getByRole('button', { name: 'Gửi liên kết', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('liên kết đặt lại mật khẩu');
  let messageId = '';
  await expect
    .poll(async () => {
      const response = await request.get('http://127.0.0.1:8025/api/v1/messages');
      const data = await response.json();
      const message = data.messages.find((m: { To: { Address: string }[] }) =>
        m.To.some((t) => t.Address === address),
      );
      messageId = message?.ID || '';
      return Boolean(messageId);
    })
    .toBe(true);
  const email = await (
    await request.get('http://127.0.0.1:8025/api/v1/message/' + messageId)
  ).json();
  const resetUrl = email.Text.match(
    /http:\/\/127\.0\.0\.1:5173\/reset-password\?token=[A-Za-z0-9_-]+/,
  )?.[0];
  expect(Boolean(resetUrl)).toBe(true);
  await page.goto(resetUrl);
  await page.getByLabel('Mật khẩu mới').fill(resetPassword);
  await page.getByRole('button', { name: 'Đặt lại mật khẩu', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Đã đặt lại mật khẩu');
  await page.goto(resetUrl);
  await page.getByLabel('Mật khẩu mới').fill(resetPassword);
  await page.getByRole('button', { name: 'Đặt lại mật khẩu', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('đã dùng hoặc hết hạn');
  await login(page, username, resetPassword);
  await page.screenshot({ path: '../.local/screenshots/catalog-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Mở menu' })).toBeVisible();
  await page.screenshot({ path: '../.local/screenshots/catalog-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
