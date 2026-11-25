import { test, expect, type Page } from '@playwright/test';

/**
 * T9：弹层键盘焦点行为测试。
 * 验证：打开时焦点落入、Tab/Shift+Tab 仅在弹层内循环、Escape 关闭、焦点回到触发按钮。
 */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});

async function activeElementInDialog(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return false;
    return !!el.closest('[role="dialog"]');
  });
}

test('管理登录弹层：焦点落入 + Tab 循环 + Escape + 焦点返回', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '管理' }).click();
  await expect(page.locator('#admin-password')).toBeVisible();

  // 1) 打开时焦点落入密码输入框
  await expect(page.locator('#admin-password')).toBeFocused();

  // 2) Tab 正向循环 12 次，始终不离开弹层
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    expect(await activeElementInDialog(page)).toBe(true);
  }

  // 3) Shift+Tab 反向循环 12 次，始终不离开弹层
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Shift+Tab');
    expect(await activeElementInDialog(page)).toBe(true);
  }

  // 4) Escape 关闭弹层
  await page.keyboard.press('Escape');
  await expect(page.locator('[role="dialog"]')).toHaveCount(0);

  // 5) 焦点回到触发按钮
  await expect(page.getByRole('button', { name: '管理' })).toBeFocused();
});

test('选择旅行弹层：焦点落入当前行程 + Tab 循环 + Escape + 焦点返回', async ({ page }) => {
  // 先选中一个行程，使弹层中有 aria-current=page 的当前项
  await page.goto('/?tab=plan&wish=in-memory-1');
  await expect(page.getByRole('button', { name: '切换旅行' })).toBeVisible();
  await page.getByRole('button', { name: '切换旅行' }).click();

  const dialog = page.locator('[role="dialog"]').last();
  await expect(dialog).toBeVisible();

  // 1) 打开时焦点落入当前行程（aria-current=page）
  const currentBtn = dialog.locator('button[aria-current="page"]').first();
  await expect(currentBtn).toBeFocused();

  // 2) Tab 正向循环
  for (let i = 0; i < 14; i++) {
    await page.keyboard.press('Tab');
    expect(await activeElementInDialog(page)).toBe(true);
  }
  // 3) Shift+Tab 反向循环
  for (let i = 0; i < 14; i++) {
    await page.keyboard.press('Shift+Tab');
    expect(await activeElementInDialog(page)).toBe(true);
  }

  // 4) Escape 关闭
  await page.keyboard.press('Escape');
  await expect(page.locator('[role="dialog"]')).toHaveCount(0);

  // 5) 焦点回到触发按钮
  await expect(page.getByRole('button', { name: '切换旅行' })).toBeFocused();
});
