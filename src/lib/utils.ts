import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  MYR: 'RM', USD: '$', SGD: 'S$', EUR: '€', GBP: '£', AUD: 'A$',
  JPY: '¥', CNY: '¥', HKD: 'HK$', THB: '฿', IDR: 'Rp', PHP: '₱', INR: '₹',
};

const CURRENCY_LOCALES: Record<string, string> = {
  MYR: 'en-MY', USD: 'en-US', SGD: 'en-SG', EUR: 'de-DE', GBP: 'en-GB',
  AUD: 'en-AU', JPY: 'ja-JP', CNY: 'zh-CN', HKD: 'en-HK', THB: 'th-TH',
  IDR: 'id-ID', PHP: 'en-PH', INR: 'en-IN',
};

export function getCurrencySymbol(currencyCode?: string | null): string {
  return CURRENCY_SYMBOLS[currencyCode || 'MYR'] || currencyCode || 'RM';
}

export function formatCurrency(amount: number, currencyCode?: string | null): string {
  const code = currencyCode || 'MYR';
  const symbol = getCurrencySymbol(code);
  const locale = CURRENCY_LOCALES[code] || 'en-MY';
  const decimals = code === 'JPY' ? 0 : 2;
  return `${symbol} ${amount.toLocaleString(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}
