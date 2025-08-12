// lib/currency-converter.ts
// Currency conversion utility for the BalikBayani Portal

// Currency conversion rates (you can update these or fetch from an API)
export const CURRENCY_RATES = {
  USD: 1,
  PHP: 0.018, // 1 PHP = 0.018 USD (approximate)
  EUR: 1.09,  // 1 EUR = 1.09 USD (approximate)
  GBP: 1.27,  // 1 GBP = 1.27 USD (approximate)
  JPY: 0.0067, // 1 JPY = 0.0067 USD (approximate)
  AUD: 0.66,  // 1 AUD = 0.66 USD (approximate)
  CAD: 0.74,  // 1 CAD = 0.74 USD (approximate)
  SGD: 0.74,  // 1 SGD = 0.74 USD (approximate)
  HKD: 0.13,  // 1 HKD = 0.13 USD (approximate)
  KRW: 0.00076, // 1 KRW = 0.00076 USD (approximate)
} as const;

export type Currency = keyof typeof CURRENCY_RATES;

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
    currency: currency,
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

// Available currencies for selection
export const AVAILABLE_CURRENCIES: { value: Currency; label: string }[] = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'PHP', label: 'PHP - Philippine Peso' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'JPY', label: 'JPY - Japanese Yen' },
  { value: 'AUD', label: 'AUD - Australian Dollar' },
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
  { value: 'SGD', label: 'SGD - Singapore Dollar' },
  { value: 'HKD', label: 'HKD - Hong Kong Dollar' },
  { value: 'KRW', label: 'KRW - South Korean Won' },
];

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
