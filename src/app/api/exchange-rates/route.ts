import { NextRequest, NextResponse } from 'next/server';
import { CurrencyCode, ExchangeRateRecord } from '@/types';
import { ExchangeRateDB } from '@/lib/database';

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
const defaultActiveCurrencies: string[] = ['USD', 'EUR', 'GBP', 'JPY', 'KRW'];

// 默认货币元数据（空，因为默认货币都是基础货币）
const defaultCurrencyMeta: Record<string, { baseCode: CurrencyCode; note?: string }> = {};

export async function GET() {
  try {
    const storedData = await ExchangeRateDB.get();
    
    const customRates = storedData?.customExchangeRates || null;
    const activeCurrencies = storedData?.activeCurrencies?.length
      ? storedData.activeCurrencies
      : defaultActiveCurrencies;
    const currencyMeta = storedData?.currencyMeta || defaultCurrencyMeta;
    const lastUpdated = storedData?.lastUpdated || new Date().toISOString();
    
    // 构建所有汇率记录（包括基础货币和自定义货币）
    const ratesMap: Record<string, number> = {};
    
    // 先加入默认基础货币
    for (const [code, rate] of Object.entries(defaultExchangeRates)) {
      ratesMap[code] = customRates?.[code] || rate;
    }
    
    // 加入自定义货币（带备注的）
    if (customRates) {
      for (const [id, rate] of Object.entries(customRates)) {
        if (!(id in defaultExchangeRates)) {
          ratesMap[id] = rate;
        }
      }
    }

    const rates: ExchangeRateRecord[] = Object.entries(ratesMap).map(([code, rate]) => {
      const meta = currencyMeta[code];
      return {
        code,
        baseCode: meta?.baseCode || (code in defaultExchangeRates ? code as CurrencyCode : 'CNY'),
        note: meta?.note,
        rate,
        updatedAt: lastUpdated,
      };
    });

    return NextResponse.json({
      rates,
      activeCurrencies,
      currencyMeta,
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
    const { rates, activeCurrencies: newActiveCurrencies, currencyMeta: newCurrencyMeta } = body as {
      rates?: Record<string, number>;
      activeCurrencies?: string[];
      currencyMeta?: Record<string, { baseCode: CurrencyCode; note?: string }>;
    };

    const storedData = await ExchangeRateDB.get();
    
    let customRates = storedData?.customExchangeRates
      ? { ...storedData.customExchangeRates }
      : null;
    let activeCurrencies = storedData?.activeCurrencies?.length
      ? [...storedData.activeCurrencies]
      : [...defaultActiveCurrencies];
    let currencyMeta = storedData?.currencyMeta
      ? { ...storedData.currencyMeta }
      : { ...defaultCurrencyMeta };

    if (rates && typeof rates === 'object') {
      customRates = { ...rates };
    }

    if (newActiveCurrencies && Array.isArray(newActiveCurrencies)) {
      activeCurrencies = newActiveCurrencies;
    }

    if (newCurrencyMeta && typeof newCurrencyMeta === 'object') {
      currencyMeta = { ...newCurrencyMeta };
    }

    const lastUpdated = new Date().toISOString();

    await ExchangeRateDB.set({
      customExchangeRates: customRates,
      activeCurrencies,
      currencyMeta,
      lastUpdated,
    });

    // 构建返回的汇率记录
    const ratesMap: Record<string, number> = {};
    for (const [code, rate] of Object.entries(defaultExchangeRates)) {
      ratesMap[code] = customRates?.[code] || rate;
    }
    if (customRates) {
      for (const [id, rate] of Object.entries(customRates)) {
        if (!(id in defaultExchangeRates)) {
          ratesMap[id] = rate;
        }
      }
    }

    const updatedRates: ExchangeRateRecord[] = Object.entries(ratesMap).map(([code, rate]) => {
      const meta = currencyMeta[code];
      return {
        code,
        baseCode: meta?.baseCode || (code in defaultExchangeRates ? code as CurrencyCode : 'CNY'),
        note: meta?.note,
        rate,
        updatedAt: lastUpdated,
      };
    });

    return NextResponse.json({
      rates: updatedRates,
      activeCurrencies,
      currencyMeta,
      updatedAt: lastUpdated,
    });
  } catch (error) {
    console.error('Error updating exchange rates:', error);
    return NextResponse.json({ error: 'Failed to update exchange rates' }, { status: 500 });
  }
}
