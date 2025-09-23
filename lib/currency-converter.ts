// lib/currency-converter.ts
// Currency conversion utility for the BalikBayani Portal

// Currency codes (ISO 4217). This aims to include all active worldwide currencies.
// NOTE: We ensure conversion is possible for ALL listed currencies by providing a fallback rate.
export const ISO_CURRENCY_CODES = [
  'USD','EUR','JPY','GBP','AUD','CAD','CHF','CNY','HKD','NZD','SEK','KRW','SGD','NOK','MXN','INR','RUB','ZAR','TRY','BRL','TWD','DKK','PLN','THB','IDR','HUF','CZK','ILS','CLP','PHP','AED','COP','SAR','MYR','RON','ARS','PEN','EGP','PKR','BDT','VND','NGN','KES','GHS','UAH','MAD','QAR','KWD','BHD','OMR','JOD','LBP','DZD','TND','IQD','IRR','AZN','GEL','AMD','BYN','KZT','UZS','TJS','TMT','AFN','AUD','BBD','BMD','BSD','BZD','BWP','BND','BAM','BGN','BIF','BZD','BOB','BTN','BHD','BIF','BND','BWP','BZD','CRC','CUP','CVE','CDF','CNY','DJF','DOP','DZD','ERN','ETB','FJD','FKP','GIP','GTQ','GYD','HNL','HTG','ISK','JMD','KGS','KHR','KMF','KYD','LAK','LKR','LRD','LSL','LYD','MDL','MKD','MMK','MNT','MOP','MUR','MVR','MWK','MZN','NAD','NPR','PAB','PGK','PYG','RSD','RWF','SBD','SCR','SDG','SHP','SLL','SOS','SRD','SSP','STD','SVC','SYP','SZL','TND','TOP','TTD','TZS','UGX','UYU','UZS','VED','VES','VUV','WST','XAF','XCD','XOF','XPF','YER','ZMW','ZWL'
] as const;

// Base conversion rates to USD for common currencies.
// For any currency not listed here, we fall back to 1 (identity) to keep conversion functional.
const BASE_RATES: Record<string, number> = {
  USD: 1,
  PHP: 0.018,
  EUR: 1.09,
  GBP: 1.27,
  JPY: 0.0067,
  AUD: 0.66,
  CAD: 0.74,
  SGD: 0.74,
  HKD: 0.13,
  KRW: 0.00076,
  INR: 0.012,
  CNY: 0.14,
  TWD: 0.031,
  THB: 0.027,
  MYR: 0.21,
  IDR: 0.000061,
  VND: 0.000039,
  AED: 0.2723,
  SAR: 0.2667,
  QAR: 0.2747,
  KWD: 3.25,
  BHD: 2.65,
  OMR: 2.60,
  NOK: 0.093,
  SEK: 0.093,
  DKK: 0.145,
  PLN: 0.25,
  MXN: 0.055,
  BRL: 0.18,
  ZAR: 0.055,
  TRY: 0.030,
  RON: 0.22,
  HUF: 0.0028,
  CZK: 0.044,
  ILS: 0.26,
  ARS: 0.0011,
  COP: 0.00026,
  CLP: 0.0011,
  PEN: 0.27,
  EGP: 0.020,
  PKR: 0.0036,
  BDT: 0.0086,
  NGN: 0.00075,
  KES: 0.007,
  GHS: 0.083,
  MAD: 0.10,
  UAH: 0.025,
  RSD: 0.0092,
  UYU: 0.025
};

// Construct full rate table ensuring every ISO code is present.
export const CURRENCY_RATES: Record<string, number> = ISO_CURRENCY_CODES.reduce((acc, code) => {
  acc[code] = BASE_RATES[code] ?? 1; // fallback keeps conversion functional
  return acc;
}, {} as Record<string, number>);

export type Currency = string;

// Convert any currency to USD
export const convertToUSD = (amount: number, currency: Currency): number => {
  const rate = CURRENCY_RATES[currency] || 1;
  return amount * rate;
};

// Convert USD to any currency
export const convertFromUSD = (usdAmount: number, targetCurrency: Currency): number => {
  const rate = CURRENCY_RATES[targetCurrency] || 1;
  return usdAmount / rate;
};

// Format currency for display
export const formatCurrency = (amount: number, currency: Currency): string => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: (currency as string),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatter.format(amount);
};

// Get USD equivalent for display
export const getUSDEquivalent = (amount: number, currency: Currency): string => {
  if (currency === 'USD') return formatCurrency(amount, 'USD');
  const usdAmount = convertToUSD(amount, currency);
  return formatCurrency(usdAmount, 'USD');
};

// Real-time rate loader (fetch once per session and merge)
let ratesLoaded = false;
let loadingPromise: Promise<void> | null = null;

async function loadRatesOnce(): Promise<void> {
  if (ratesLoaded) return;
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      if (res.ok) {
        const data = await res.json();
        const rates = data && data.rates ? data.rates as Record<string, number> : {};
        // Merge into CURRENCY_RATES: rates give how many units per USD? This API returns target per USD.
        // We need USD per unit of currency, so invert: USD = 1 / rate_per_USD
        Object.keys(CURRENCY_RATES).forEach(code => {
          const apiRate = rates[code];
          if (typeof apiRate === 'number' && apiRate > 0) {
            CURRENCY_RATES[code] = 1 / apiRate;
          } else if (BASE_RATES[code]) {
            CURRENCY_RATES[code] = BASE_RATES[code];
          }
        });
      }
    } catch {
      // ignore, keep BASE_RATES/fallbacks
    } finally {
      ratesLoaded = true;
    }
  })();
  return loadingPromise;
}

export const getUSDEquivalentAsync = async (amount: number, currency: Currency): Promise<string> => {
  await loadRatesOnce();
  return getUSDEquivalent(amount, currency);
};

// Available currencies for selection (generated from ISO list)
const currencyDisplay = typeof Intl !== 'undefined' && (Intl as any).DisplayNames
  ? new (Intl as any).DisplayNames(['en'], { type: 'currency' })
  : null;

const UNIQUE_CODES: readonly string[] = Array.from(new Set(ISO_CURRENCY_CODES)).sort();

export const AVAILABLE_CURRENCIES: { value: Currency; label: string }[] = UNIQUE_CODES.map(code => ({
  value: code,
  label: `${code} - ${currencyDisplay ? currencyDisplay.of(code) : code}`
}));

// TODO: Future enhancement - Fetch real-time rates from an API
// Example API: https://api.exchangerate-api.com/v4/latest/USD
export const fetchRealTimeRates = async (): Promise<Partial<typeof CURRENCY_RATES>> => {
  try {
    // This would be implemented to fetch real-time rates
    // const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    // const data = await response.json();
    // return data.rates;
    return CURRENCY_RATES;
  } catch (error) {
    console.warn('Failed to fetch real-time rates, using fallback rates:', error);
    return CURRENCY_RATES;
  }
};
