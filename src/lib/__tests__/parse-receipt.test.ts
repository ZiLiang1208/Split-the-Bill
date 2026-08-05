import { GeminiRequestError, isRateLimited, parseGeminiJson } from '@/lib/parse-receipt';

describe('parseGeminiJson', () => {
  it('parses a well-formed response into items/tax/tip/discount', () => {
    const content = JSON.stringify({
      items: [
        { name: 'Burger', price: 12, quantity: 1 },
        { name: 'Fries', price: 5, quantity: 2 },
      ],
      tax: 1.5,
      tip: 3,
      discount: 2,
    });

    const result = parseGeminiJson(content);

    expect(result.tax).toBe(1.5);
    expect(result.tip).toBe(3);
    expect(result.discount).toBe(2);
    expect(result.discountMode).toBe('amount');
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({ name: 'Burger', price: 12, quantity: 1 });
    expect(result.items[1]).toMatchObject({ name: 'Fries', price: 5, quantity: 2 });
    // Every item gets a generated id.
    expect(result.items[0].id).toBeTruthy();
    expect(result.items[0].id).not.toBe(result.items[1].id);
  });

  it('defaults tax, tip, and discount to 0 when absent', () => {
    const content = JSON.stringify({ items: [{ name: 'Water', price: 2 }] });
    const result = parseGeminiJson(content);
    expect(result.tax).toBe(0);
    expect(result.tip).toBe(0);
    expect(result.discount).toBe(0);
    expect(result.discountMode).toBe('amount');
  });

  it('defaults a non-numeric discount to 0', () => {
    const content = JSON.stringify({ items: [{ name: 'Water', price: 2 }], discount: 'ten percent' });
    const result = parseGeminiJson(content);
    expect(result.discount).toBe(0);
  });

  it('normalizes a negative discount value to its absolute value', () => {
    const content = JSON.stringify({ items: [{ name: 'Water', price: 2 }], discount: -5 });
    const result = parseGeminiJson(content);
    expect(result.discount).toBe(5);
    expect(result.discountMode).toBe('amount');
  });

  describe('percentage discounts', () => {
    it('uses percent mode when the receipt showed a percentage', () => {
      const content = JSON.stringify({
        items: [{ name: 'Pasta', price: 20 }, { name: 'Wine', price: 15 }],
        discount: 3.5,
        discountPercent: 10,
      });
      const result = parseGeminiJson(content);
      expect(result.discountMode).toBe('percent');
      expect(result.discount).toBe(10);
    });

    it('stays in amount mode when only a dollar discount was found', () => {
      const content = JSON.stringify({
        items: [{ name: 'Pasta', price: 20 }],
        discount: 4,
        discountPercent: 0,
      });
      const result = parseGeminiJson(content);
      expect(result.discountMode).toBe('amount');
      expect(result.discount).toBe(4);
    });

    it('ignores a nonsensical percentage above 100 and falls back to the amount', () => {
      const content = JSON.stringify({
        items: [{ name: 'Pasta', price: 20 }],
        discount: 4,
        discountPercent: 500,
      });
      const result = parseGeminiJson(content);
      expect(result.discountMode).toBe('amount');
      expect(result.discount).toBe(4);
    });

    it('prefers the flat amount when a stray negative item also had to be folded in', () => {
      // A percentage can't represent "10% plus this other negative line", so
      // the summed dollar amount is the only faithful representation.
      const content = JSON.stringify({
        items: [{ name: 'Pasta', price: 20 }, { name: 'Coupon', price: -2 }],
        discount: 3,
        discountPercent: 10,
      });
      const result = parseGeminiJson(content);
      expect(result.discountMode).toBe('amount');
      expect(result.discount).toBe(5);
    });
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

  it('folds a stray negative-price item (model put a discount in the items list) into the discount total, and excludes it from items', () => {
    const content = JSON.stringify({
      items: [
        { name: 'Burger', price: 12 },
        { name: 'Loyalty Discount', price: -3 },
        { name: 'Fries', price: 5 },
      ],
    });
    const result = parseGeminiJson(content);
    expect(result.items.map((i) => i.name)).toEqual(['Burger', 'Fries']);
    expect(result.discount).toBe(3);
  });

  it('adds a stray negative item on top of an explicit discount field, rather than overwriting it', () => {
    const content = JSON.stringify({
      items: [{ name: 'Burger', price: 12 }, { name: 'Coupon', price: -2 }],
      discount: 5,
    });
    const result = parseGeminiJson(content);
    expect(result.discount).toBe(7);
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

describe('GeminiRequestError / isRateLimited', () => {
  it('carries the HTTP status code and reads as a normal Error', () => {
    const error = new GeminiRequestError('Gemini request failed (429): quota exceeded', 429);
    expect(error).toBeInstanceOf(Error);
    expect(error.status).toBe(429);
    expect(error.message).toContain('429');
  });

  it('recognizes a 429 as rate-limited', () => {
    expect(isRateLimited(new GeminiRequestError('rate limited', 429))).toBe(true);
  });

  it('does not treat other status codes as rate-limited', () => {
    expect(isRateLimited(new GeminiRequestError('bad request', 400))).toBe(false);
    expect(isRateLimited(new GeminiRequestError('server error', 500))).toBe(false);
  });

  it('does not treat a plain Error (e.g. a network failure) as rate-limited', () => {
    expect(isRateLimited(new Error('Failed to fetch'))).toBe(false);
    expect(isRateLimited('not even an error')).toBe(false);
    expect(isRateLimited(null)).toBe(false);
  });
});
