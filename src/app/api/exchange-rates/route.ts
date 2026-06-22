import { NextRequest, NextResponse } from 'next/server';
import { CurrencyCode, ExchangeRateRecord } from '@/types';
import { promises as fs } from 'fs';
import path from 'path';

// 默认汇率数据（基于人民币）
const defaultExchangeRates: Record<CurrencyCode, number> = {
  CNY: 1,      // 人民币
  USD: 7.2,    // 美元
  EUR: 7.8,    // 欧元
  GBP: 9.0,    // 英镑
  JPY: 0.048,  // 日元
  KRW: 0.0052, // 韩元
  HKD: 0.92,   // 港币
  TWD: 0.22,   // 新台币
  THB: 0.20,   // 泰铢
  SGD: 5.3,    // 新加坡元
  MYR: 1.55,   // 马来西亚林吉特
  VND: 0.00029, // 越南盾
};

// 默认活跃货币列表（不含人民币）
const defaultActiveCurrencies: CurrencyCode[] = ['USD', 'EUR', 'GBP', 'JPY', 'KRW'];

// 存储文件路径
const DATA_FILE_PATH = path.join(process.cwd(), '.data', 'exchange-rates.json');

// 确保数据目录存在
async function ensureDataDir() {
  const dataDir = path.dirname(DATA_FILE_PATH);
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

// 从文件加载数据
async function loadData(): Promise<{
  customExchangeRates: Record<CurrencyCode, number> | null;
  activeCurrencies: CurrencyCode[];
  lastUpdated: string;
}> {
  try {
    await ensureDataDir();
    const content = await fs.readFile(DATA_FILE_PATH, 'utf-8');
    const data = JSON.parse(content);
    return {
      customExchangeRates: data.customExchangeRates || null,
      activeCurrencies: data.activeCurrencies || defaultActiveCurrencies,
      lastUpdated: data.lastUpdated || new Date().toISOString(),
    };
  } catch {
    // 文件不存在或读取失败，返回默认值
    return {
      customExchangeRates: null,
      activeCurrencies: defaultActiveCurrencies,
      lastUpdated: new Date().toISOString(),
    };
  }
}

// 保存数据到文件
async function saveData(data: {
  customExchangeRates: Record<CurrencyCode, number> | null;
  activeCurrencies: CurrencyCode[];
  lastUpdated: string;
}) {
  try {
    await ensureDataDir();
    await fs.writeFile(DATA_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving exchange rates:', error);
    throw error;
  }
}

export async function GET() {
  try {
    const data = await loadData();
    
    // 返回所有汇率和活跃货币列表
    const rates: ExchangeRateRecord[] = (Object.keys(defaultExchangeRates) as CurrencyCode[]).map(code => ({
      code,
      rate: data.customExchangeRates?.[code] || defaultExchangeRates[code],
      updatedAt: data.lastUpdated,
    }));

    return NextResponse.json({
      rates,
      activeCurrencies: data.activeCurrencies,
      updatedAt: data.lastUpdated,
    });
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    return NextResponse.json({ error: 'Failed to fetch exchange rates' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { rates, activeCurrencies: newActiveCurrencies } = body as {
      rates?: Partial<Record<CurrencyCode, number>>;
      activeCurrencies?: CurrencyCode[];
    };

    // 加载当前数据
    const currentData = await loadData();
    
    // 更新汇率
    if (rates && typeof rates === 'object') {
      currentData.customExchangeRates = { ...defaultExchangeRates };
      for (const [code, rate] of Object.entries(rates)) {
        if (typeof rate === 'number' && rate > 0) {
          currentData.customExchangeRates[code as CurrencyCode] = rate;
        }
      }
    }

    // 更新活跃货币列表
    if (newActiveCurrencies && Array.isArray(newActiveCurrencies)) {
      currentData.activeCurrencies = newActiveCurrencies;
    }

    currentData.lastUpdated = new Date().toISOString();

    // 保存到文件
    await saveData(currentData);

    // 返回更新后的数据
    const updatedRates: ExchangeRateRecord[] = (Object.keys(defaultExchangeRates) as CurrencyCode[]).map(code => ({
      code,
      rate: currentData.customExchangeRates?.[code] || defaultExchangeRates[code],
      updatedAt: currentData.lastUpdated,
    }));

    return NextResponse.json({
      rates: updatedRates,
      activeCurrencies: currentData.activeCurrencies,
      updatedAt: currentData.lastUpdated,
    });
  } catch (error) {
    console.error('Error updating exchange rates:', error);
    return NextResponse.json({ error: 'Failed to update exchange rates' }, { status: 500 });
  }
}
