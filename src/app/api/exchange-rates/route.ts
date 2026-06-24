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
const defaultActiveCurrencies: CurrencyCode[] = ['USD', 'EUR', 'GBP', 'JPY', 'KRW'];

export async function GET() {
  try {
    const storedData = await ExchangeRateDB.get();
    
    const customRates = storedData?.customExchangeRates || null;
    const activeCurrencies = storedData?.activeCurrencies?.length
      ? storedData.activeCurrencies as CurrencyCode[]
      : defaultActiveCurrencies;
    const lastUpdated = storedData?.lastUpdated || new Date().toISOString();
    
    const rates: ExchangeRateRecord[] = (Object.keys(defaultExchangeRates) as CurrencyCode[]).map(code => ({
      code,
      rate: customRates?.[code] || defaultExchangeRates[code],
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

    const storedData = await ExchangeRateDB.get();
    
    let customRates = storedData?.customExchangeRates
      ? { ...storedData.customExchangeRates }
      : null;
    let activeCurrencies = storedData?.activeCurrencies?.length
      ? [...storedData.activeCurrencies] as CurrencyCode[]
      : [...defaultActiveCurrencies];

    if (rates && typeof rates === 'object') {
      customRates = { ...defaultExchangeRates };
      for (const [code, rate] of Object.entries(rates)) {
        if (typeof rate === 'number' && rate > 0) {
          customRates[code as CurrencyCode] = rate;
        }
      }
    }

    if (newActiveCurrencies && Array.isArray(newActiveCurrencies)) {
      activeCurrencies = newActiveCurrencies;
    }

    const lastUpdated = new Date().toISOString();

    await ExchangeRateDB.set({
      customExchangeRates: customRates,
      activeCurrencies,
      lastUpdated,
    });

    const updatedRates: ExchangeRateRecord[] = (Object.keys(defaultExchangeRates) as CurrencyCode[]).map(code => ({
      code,
      rate: customRates?.[code] || defaultExchangeRates[code],
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
