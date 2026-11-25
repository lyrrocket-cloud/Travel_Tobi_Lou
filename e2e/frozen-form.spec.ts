import { test, expect, type APIRequestContext } from '@playwright/test';

/**
 * T12 / T11：冻结表单键盘不可修改 + 非冻结行程可编辑回归。
 * 通过 API 切换 in-memory-1 行程的 frozen 状态，并在 finally 中恢复为原始值。
 */
const WISH_ID = 'in-memory-1';

async function getPlan(request: APIRequestContext): Promise<{ id: string; frozen: boolean }> {
  const res = await request.get(`/api/trip-plans?wishId=${WISH_ID}`);
  const json = await res.json();
  const plan = json.tripPlans[0];
  return { id: plan.id, frozen: !!plan.frozen };
}

async function setFrozen(request: APIRequestContext, planId: string, frozen: boolean) {
  await request.put('/api/trip-plans', { data: { id: planId, frozen } });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});

test('冻结时：文本输入 readOnly、键盘输入无效、保存按钮禁用', async ({ page, request }) => {
  const { id: planId, frozen: originalFrozen } = await getPlan(request);
  await setFrozen(request, planId, true);
  try {
    await page.goto('/?tab=account&wish=in-memory-1&sub=entry');
    const location = page.locator('#expense-location');
    await expect(location).toBeVisible();

    // 控件级 readOnly（而非仅 pointer-events）
    await expect(location).toHaveAttribute('readonly', '');

    // 键盘输入无法改变值
    await location.focus();
    await page.keyboard.type('黑客输入');
    await expect(location).toHaveValue('');

    // 保存按钮禁用
    await expect(page.getByRole('button', { name: '保存消费' })).toBeDisabled();
  } finally {
    await setFrozen(request, planId, originalFrozen);
  }
});

test('非冻结时：输入框可编辑（回归不被误伤）', async ({ page, request }) => {
  const { id: planId, frozen: originalFrozen } = await getPlan(request);
  await setFrozen(request, planId, false);
  try {
    await page.goto('/?tab=account&wish=in-memory-1&sub=entry');
    const location = page.locator('#expense-location');
    await expect(location).toBeVisible();
    await expect(location).not.toHaveAttribute('readonly', /.*/);

    await location.fill('测试可编辑');
    await expect(location).toHaveValue('测试可编辑');
  } finally {
    await setFrozen(request, planId, originalFrozen);
  }
});
