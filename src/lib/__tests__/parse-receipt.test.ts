import { parseGeminiJson } from '@/lib/parse-receipt';

describe('parseGeminiJson', () => {
  it('parses a well-formed response into items/tax/tip', () => {
    const content = JSON.stringify({
      items: [
        { name: 'Burger', price: 12, quantity: 1 },
        { name: 'Fries', price: 5, quantity: 2 },
      ],
      tax: 1.5,
      tip: 3,
    });

    const result = parseGeminiJson(content);

    expect(result.tax).toBe(1.5);
    expect(result.tip).toBe(3);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({ name: 'Burger', price: 12, quantity: 1 });
    expect(result.items[1]).toMatchObject({ name: 'Fries', price: 5, quantity: 2 });
    // Every item gets a generated id.
    expect(result.items[0].id).toBeTruthy();
    expect(result.items[0].id).not.toBe(result.items[1].id);
  });

  it('defaults tax and tip to 0 when absent', () => {
    const content = JSON.stringify({ items: [{ name: 'Water', price: 2 }] });
    const result = parseGeminiJson(content);
    expect(result.tax).toBe(0);
    expect(result.tip).toBe(0);
  });

  it('defaults a missing/blank item name to "Item N" (1-indexed)', () => {
    const content = JSON.stringify({
      items: [{ price: 1 }, { name: '   ', price: 2 }],
    });
    const result = parseGeminiJson(content);
    expect(result.items[0].name).toBe('Item 1');
    expect(result.items[1].name).toBe('Item 2');
  });

  it('defaults a missing or non-numeric item price to 0', () => {
    const content = JSON.stringify({
      items: [{ name: 'A' }, { name: 'B', price: 'free' }, { name: 'C', price: NaN }],
    });
    const result = parseGeminiJson(content);
    expect(result.items.map((i) => i.price)).toEqual([0, 0, 0]);
  });

  it('defaults a missing, zero, or negative item quantity to 1', () => {
    const content = JSON.stringify({
      items: [
        { name: 'A', price: 1 },
        { name: 'B', price: 1, quantity: 0 },
        { name: 'C', price: 1, quantity: -2 },
      ],
    });
    const result = parseGeminiJson(content);
    expect(result.items.map((i) => i.quantity)).toEqual([1, 1, 1]);
  });

  it('drops items with a negative price (discounts/refunds) but keeps the rest', () => {
    const content = JSON.stringify({
      items: [
        { name: 'Burger', price: 12 },
        { name: 'Loyalty Discount', price: -3 },
        { name: 'Fries', price: 5 },
      ],
    });
    const result = parseGeminiJson(content);
    expect(result.items.map((i) => i.name)).toEqual(['Burger', 'Fries']);
  });

  it('keeps a $0 item (not negative, just free)', () => {
    const content = JSON.stringify({ items: [{ name: 'Free Sample', price: 0 }] });
    const result = parseGeminiJson(content);
    expect(result.items).toHaveLength(1);
  });

  it('returns an empty items array when the receipt has none', () => {
    const content = JSON.stringify({ items: [], tax: 0, tip: 0 });
    const result = parseGeminiJson(content);
    expect(result.items).toEqual([]);
  });

  it('throws a friendly error for malformed JSON', () => {
    expect(() => parseGeminiJson('not json{')).toThrow(
      'Could not parse the receipt data returned by Gemini.'
    );
  });

  it('throws a friendly error when "items" is missing entirely', () => {
    expect(() => parseGeminiJson(JSON.stringify({ tax: 1, tip: 1 }))).toThrow(
      'Receipt data was missing an items list.'
    );
  });

  it('throws a friendly error when "items" is present but not an array', () => {
    expect(() => parseGeminiJson(JSON.stringify({ items: 'nope' }))).toThrow(
      'Receipt data was missing an items list.'
    );
  });
});
