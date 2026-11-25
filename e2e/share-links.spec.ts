import { test, expect, type Page } from '@playwright/test';

/**
 * T6：分享链接深度还原测试。
 * 每个测试在全新无 localStorage 的上下文中打开分享 URL，
 * 验证主标签 / 子标签 / 行程 / 第几天被正确还原（而非落到默认值）。
 */
test.beforeEach(async ({ page }) => {
  // 确保无任何本地缓存，模拟首次打开分享链接
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});

async function expectTabActive(page: Page, name: string) {
  await expect(page.getByRole('tab', { name })).toHaveAttribute('data-state', 'active');
}

test('分享链接还原到许愿池', async ({ page }) => {
  await page.goto('/?tab=wish&sub=wish-pool');
  // 默认主标签是 wish、默认子标签是 make-wish；许愿池激活说明 URL 生效
  await expect(page.getByRole('button', { name: '旅行许愿' })).toHaveAttribute('aria-current', 'page');
  await expectTabActive(page, '许愿池');
});

test('分享链接还原到旅行规划第 3 天', async ({ page }) => {
  await page.goto('/?tab=plan&wish=in-memory-1&day=3');
  await expect(page.getByRole('button', { name: '旅行工具' })).toHaveAttribute('aria-current', 'page');
  // 行程条应展示济州岛
  await expect(page.getByText('济州岛', { exact: false }).first()).toBeVisible();
  // 默认第 1 天；第 3 天激活说明 day 参数生效
  await expectTabActive(page, 'Day 3');
});

test('分享链接还原到消费分析', async ({ page }) => {
  await page.goto('/?tab=account&wish=in-memory-1&sub=analysis');
  await expect(page.getByRole('button', { name: '旅行工具' })).toHaveAttribute('aria-current', 'page');
  // 默认子标签是 消费录入；消费分析激活说明 sub 参数生效
  await expectTabActive(page, '消费分析');
  await expect(page.getByText('收支结算').first()).toBeVisible();
});

test('分享链接还原到驾驶分析', async ({ page }) => {
  await page.goto('/?tab=drive&wish=in-memory-1&sub=analysis');
  await expect(page.getByRole('button', { name: '旅行工具' })).toHaveAttribute('aria-current', 'page');
  await expectTabActive(page, '驾驶分析');
  await expect(page.getByText(/总里程|驾驶分析/).first()).toBeVisible();
});
