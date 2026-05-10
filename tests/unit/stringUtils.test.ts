import { describe, it, expect } from 'vitest';
import {
  formatProductName,
  getEnglishProductName,
  getEnglishProductDesc,
  productNameTranslations,
  productDescTranslations,
} from '../../services/stringUtils';

// ──────────────────────────────────────────────
// Unit Tests: stringUtils.ts
// ──────────────────────────────────────────────

describe('formatProductName', () => {
  it('capitalizes first letter and lowercases the rest', () => {
    expect(formatProductName('PÃO CASEIRO')).toBe('Pão caseiro');
  });

  it('handles already formatted input', () => {
    expect(formatProductName('Pão caseiro')).toBe('Pão caseiro');
  });

  it('handles all lowercase input', () => {
    expect(formatProductName('pão caseiro')).toBe('Pão caseiro');
  });

  it('returns empty string for empty input', () => {
    expect(formatProductName('')).toBe('');
  });

  it('returns empty string for null/undefined', () => {
    expect(formatProductName(null as any)).toBe('');
    expect(formatProductName(undefined as any)).toBe('');
  });

  it('handles whitespace-only input', () => {
    expect(formatProductName('   ')).toBe('');
  });

  it('trims leading/trailing whitespace', () => {
    expect(formatProductName('  pão caseiro  ')).toBe('Pão caseiro');
  });

  it('handles single character', () => {
    expect(formatProductName('a')).toBe('A');
    expect(formatProductName('A')).toBe('A');
  });
});

describe('getEnglishProductName', () => {
  it('returns exact match translation', () => {
    expect(getEnglishProductName('Cachorro quente completo')).toBe('Full Hot Dog');
  });

  it('returns translation for bread items', () => {
    expect(getEnglishProductName('Pão Tradicional')).toBe('Whole Wheat Bread');
    expect(getEnglishProductName('Pão de Leite')).toBe('Milk Bread');
    expect(getEnglishProductName('Pão de queijo')).toBe('Cheese Bread');
  });

  it('handles case-insensitive matching', () => {
    expect(getEnglishProductName('cachorro quente completo')).toBe('Full Hot Dog');
    expect(getEnglishProductName('CACHORRO QUENTE COMPLETO')).toBe('Full Hot Dog');
  });

  it('returns original name when no translation found', () => {
    expect(getEnglishProductName('Produto Inexistente')).toBe('Produto Inexistente');
  });

  it('returns empty string for empty input', () => {
    expect(getEnglishProductName('')).toBe('');
  });

  it('translates pizza items', () => {
    expect(getEnglishProductName('Pizza mexicana')).toBe('Mexican Pizza');
    expect(getEnglishProductName('Pizza de frango')).toBe('Chicken Pizza');
  });

  it('translates coffee items', () => {
    expect(getEnglishProductName('Café pingado')).toBe('Macchiato');
    expect(getEnglishProductName('Café gelado')).toBe('Iced Coffee');
    expect(getEnglishProductName('Espresso')).toBe('Espresso');
  });

  it('translates pastry items', () => {
    expect(getEnglishProductName('Pastel de nata')).toBe('Pastel de Nata');
    expect(getEnglishProductName('Donuts')).toBe('Donuts');
    expect(getEnglishProductName('Croisant recheado')).toBe('Stuffed Croissant');
  });

  it('handles accent-insensitive matching', () => {
    // Remove accents and try matching
    expect(getEnglishProductName('Pao caseiro')).toBe('Homemade Bread');
  });

  it('all translations in the dictionary have valid mappings', () => {
    for (const [key, value] of Object.entries(productNameTranslations)) {
      expect(value).toBeTruthy();
      expect(typeof value).toBe('string');
      expect(getEnglishProductName(key)).toBe(value);
    }
  });
});

describe('getEnglishProductDesc', () => {
  it('returns description for known product', () => {
    expect(getEnglishProductDesc('Donuts')).toBe('Fried dough with classic sweet glaze.');
  });

  it('returns empty string for unknown product', () => {
    expect(getEnglishProductDesc('Produto Desconhecido')).toBe('');
  });

  it('returns description for bread items', () => {
    expect(getEnglishProductDesc('Pão Tradicional')).toBe('Fresh and crispy, baked multiple times a day.');
  });

  it('all descriptions have valid content', () => {
    for (const [key, value] of Object.entries(productDescTranslations)) {
      expect(value).toBeTruthy();
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(5);
    }
  });
});
