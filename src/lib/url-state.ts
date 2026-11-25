// 旅行工具箱 - 唯一 URL 状态模型
// 单一入口解析/序列化，避免多个组件各自拼接互相矛盾的 query 参数。
// 参数命名统一：tab(主) / sub(子) / wish(tripId) / day(dayIndex)
// 记账查询筛选：q_cat / q_payer / q_cur / q_from / q_to
// 兼容旧参数：subTab（记账子标签，等价于 sub）

export type MainTab = 'wish' | 'plan' | 'account' | 'drive';
export type AccountSubTab = 'entry' | 'query' | 'analysis';
export type DriveSubTab = 'entry' | 'query' | 'analysis';
export type WishSubTab = 'make-wish' | 'wish-pool';

export const VALID_MAIN_TABS: MainTab[] = ['wish', 'plan', 'account', 'drive'];
export const VALID_WISH_SUB: WishSubTab[] = ['make-wish', 'wish-pool'];
export const VALID_ACCOUNT_SUB: AccountSubTab[] = ['entry', 'query', 'analysis'];
export const VALID_DRIVE_SUB: DriveSubTab[] = ['entry', 'query', 'analysis'];

export interface AccountQueryFilters {
  category: string | null;
  payer: string | null;
  currency: string | null;
  dateFrom: string;
  dateTo: string;
}

export const EMPTY_FILTERS: AccountQueryFilters = {
  category: null,
  payer: null,
  currency: null,
  dateFrom: '',
  dateTo: '',
};

export interface UrlState {
  tab: MainTab | null;
  sub: string | null;
  wish: string | null;
  day: number | null;
  filters: AccountQueryFilters | null;
}

export const EMPTY_URL_STATE: UrlState = {
  tab: null,
  sub: null,
  wish: null,
  day: null,
  filters: null,
};

function getSearch(): string {
  if (typeof window === 'undefined') return '';
  return window.location.search;
}

function isValidMainTab(v: string | null): v is MainTab {
  return !!v && (VALID_MAIN_TABS as string[]).includes(v);
}

function isValidSubForTab(tab: MainTab | null, sub: string | null): boolean {
  if (!sub) return false;
  if (tab === 'wish') return (VALID_WISH_SUB as string[]).includes(sub);
  if (tab === 'account') return (VALID_ACCOUNT_SUB as string[]).includes(sub);
  if (tab === 'drive') return (VALID_DRIVE_SUB as string[]).includes(sub);
  return false;
}

/** 解析当前 URL 的状态，对非法/缺失/越界参数安全回退（返回 null 表示该字段未提供或无效）。 */
export function readUrlState(search?: string): UrlState {
  const params = new URLSearchParams(search ?? getSearch());
  const rawTab = params.get('tab');
  const tab = isValidMainTab(rawTab) ? rawTab : null;

  // sub：统一子标签；兼容旧参数 subTab（记账子标签）
  let sub = params.get('sub');
  if (!sub && tab === 'account') {
    const legacy = params.get('subTab');
    if (legacy) sub = legacy;
  }
  if (!isValidSubForTab(tab, sub)) sub = null;

  const wish = params.get('wish');

  let day: number | null = null;
  const rawDay = params.get('day');
  if (rawDay) {
    const n = parseInt(rawDay, 10);
    if (Number.isFinite(n) && n >= 1) day = n;
  }

  // 记账筛选条件（仅在有值时纳入）
  const category = params.get('q_cat');
  const payer = params.get('q_payer');
  const currency = params.get('q_cur');
  const dateFrom = params.get('q_from') || '';
  const dateTo = params.get('q_to') || '';
  const hasFilters = !!(category || payer || currency || dateFrom || dateTo);

  return {
    tab,
    sub,
    wish: wish || null,
    day,
    filters: hasFilters
      ? { category, payer, currency, dateFrom, dateTo }
      : null,
  };
}

/** 将部分状态合并写入当前 URL（replaceState，不产生历史条目）。值为 null/undefined 的键会被移除。 */
export function writeUrlState(partial: Partial<UrlState>): void {
  if (typeof window === 'undefined') return;
  const current = readUrlState();
  const merged: UrlState = { ...current, ...partial };
  const params = new URLSearchParams();
  if (merged.tab) params.set('tab', merged.tab);
  if (merged.sub) params.set('sub', merged.sub);
  if (merged.wish) params.set('wish', merged.wish);
  if (merged.day) params.set('day', String(merged.day));
  const f = merged.filters;
  if (f) {
    if (f.category) params.set('q_cat', f.category);
    if (f.payer) params.set('q_payer', f.payer);
    if (f.currency) params.set('q_cur', f.currency);
    if (f.dateFrom) params.set('q_from', f.dateFrom);
    if (f.dateTo) params.set('q_to', f.dateTo);
  }
  const qs = params.toString();
  const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  window.history.replaceState({}, '', url);
}

/** 序列化完整状态为 query string（用于分享复制当前真实状态）。 */
export function serializeUrlState(state: UrlState): string {
  const params = new URLSearchParams();
  if (state.tab) params.set('tab', state.tab);
  if (state.sub) params.set('sub', state.sub);
  if (state.wish) params.set('wish', state.wish);
  if (state.day) params.set('day', String(state.day));
  const f = state.filters;
  if (f) {
    if (f.category) params.set('q_cat', f.category);
    if (f.payer) params.set('q_payer', f.payer);
    if (f.currency) params.set('q_cur', f.currency);
    if (f.dateFrom) params.set('q_from', f.dateFrom);
    if (f.dateTo) params.set('q_to', f.dateTo);
  }
  return params.toString();
}

/** 判断两个筛选集是否等价（用于决定是否写入 URL）。 */
export function filtersEqual(a: AccountQueryFilters | null, b: AccountQueryFilters | null): boolean {
  const norm = (x: AccountQueryFilters | null): AccountQueryFilters =>
    x ?? EMPTY_FILTERS;
  const na = norm(a);
  const nb = norm(b);
  return (
    na.category === nb.category &&
    na.payer === nb.payer &&
    na.currency === nb.currency &&
    na.dateFrom === nb.dateFrom &&
    na.dateTo === nb.dateTo
  );
}
