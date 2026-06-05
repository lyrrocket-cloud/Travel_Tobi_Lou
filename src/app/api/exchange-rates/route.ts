import { NextRequest, NextResponse } from 'next/server';
import { CurrencyCode, ExchangeRateRecord } from '@/types';

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

// 默认活跃货币列表
const defaultActiveCurrencies: CurrencyCode[] = ['CNY', 'USD', 'EUR', 'GBP', 'JPY', 'KRW'];

// 存储用户自定义汇率
let customExchangeRates: Record<CurrencyCode, number> | null = null;
// 存储活跃货币列表
let activeCurrencies: CurrencyCode[] = [...defaultActiveCurrencies];
let lastUpdated: string = new Date().toISOString();

export async function GET() {
  try {
    // 返回所有汇率和活跃货币列表
    const rates: ExchangeRateRecord[] = (Object.keys(defaultExchangeRates) as CurrencyCode[]).map(code => ({
      code,
      rate: customExchangeRates?.[code] || defaultExchangeRates[code],
      updatedAt: lastUpdated,
    }));

    return NextResponse.json({
      rates,
      activeCurrencies,
      updatedAt: lastUpdated,
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

    // 更新汇率
    if (rates && typeof rates === 'object') {
      customExchangeRates = { ...defaultExchangeRates };
      for (const [code, rate] of Object.entries(rates)) {
        if (typeof rate === 'number' && rate > 0) {
          customExchangeRates[code as CurrencyCode] = rate;
        }
      }
    }

    // 更新活跃货币列表
    if (newActiveCurrencies && Array.isArray(newActiveCurrencies)) {
      // 确保 CNY 始终在列表中
      if (!newActiveCurrencies.includes('CNY')) {
        newActiveCurrencies.unshift('CNY');
      }
      activeCurrencies = newActiveCurrencies;
    }

    lastUpdated = new Date().toISOString();

    // 返回更新后的数据
    const updatedRates: ExchangeRateRecord[] = (Object.keys(defaultExchangeRates) as CurrencyCode[]).map(code => ({
      code,
      rate: customExchangeRates?.[code] || defaultExchangeRates[code],
      updatedAt: lastUpdated,
    }));

    return NextResponse.json({
      rates: updatedRates,
      activeCurrencies,
      updatedAt: lastUpdated,
    });
  } catch (error) {
    console.error('Error updating exchange rates:', error);
    return NextResponse.json({ error: 'Failed to update exchange rates' }, { status: 500 });
  }
}

// 辅助函数：将金额转换为人民币
export function convertToCNY(amount: number, currency: CurrencyCode): number {
  const rate = customExchangeRates?.[currency] || defaultExchangeRates[currency];
  return amount * rate;
}

// 辅助函数：从人民币转换
export function convertFromCNY(amount: number, currency: CurrencyCode): number {
  const rate = customExchangeRates?.[currency] || defaultExchangeRates[currency];
  return amount / rate;
}