import type { Assignments, Person, ReceiptItem } from '@/lib/bill-context';
import { decodeShare, encodeShare, type ShareSnapshot } from '@/lib/share';

function snapshot(overrides: Partial<ShareSnapshot> = {}): ShareSnapshot {
  return {
    people: [],
    items: [],
    assignments: {},
    tax: 0,
    tip: 0,
    discount: 0,
    discountMode: 'amount',
    taxTipSplitMode: 'even',
    ...overrides,
  };
}

describe('encodeShare / decodeShare round trip', () => {
  it('round-trips people, items, tax, tip, and mode', () => {
    const people: Person[] = [
      { id: 'p-alice', name: 'Alice' },
      { id: 'p-bob', name: 'Bob' },
    ];
    const items: ReceiptItem[] = [
      { id: 'i-burger', name: 'Burger', price: 12, quantity: 1 },
      { id: 'i-fries', name: 'Fries', price: 5, quantity: 2 },
    ];
    const assignments: Assignments = {
      'i-burger': ['p-alice'],
      'i-fries': ['p-alice', 'p-bob'],
    };

    const encoded = encodeShare(
      snapshot({ people, items, assignments, tax: 2.5, tip: 4, discount: 3, taxTipSplitMode: 'proportional' })
    );
    const decoded = decodeShare(encoded);

    expect(decoded).not.toBeNull();
    expect(decoded!.people.map((p) => p.name)).toEqual(['Alice', 'Bob']);
    expect(decoded!.items.map((i) => [i.name, i.price, i.quantity])).toEqual([
      ['Burger', 12, 1],
      ['Fries', 5, 2],
    ]);
    expect(decoded!.tax).toBe(2.5);
    expect(decoded!.tip).toBe(4);
    expect(decoded!.discount).toBe(3);
    expect(decoded!.taxTipSplitMode).toBe('proportional');

    // Assignments are preserved by matching person *name* (ids get remapped
    // to synthetic p0/p1/... indices on decode, which is expected).
    const aliceId = decoded!.people.find((p) => p.name === 'Alice')!.id;
    const bobId = decoded!.people.find((p) => p.name === 'Bob')!.id;
    const burgerId = decoded!.items.find((i) => i.name === 'Burger')!.id;
    const friesId = decoded!.items.find((i) => i.name === 'Fries')!.id;
    expect(decoded!.assignments[burgerId]).toEqual([aliceId]);
    expect(decoded!.assignments[friesId]).toEqual([aliceId, bobId]);
  });

  it('defaults taxTipSplitMode to "even" on decode', () => {
    const encoded = encodeShare(snapshot({ taxTipSplitMode: 'even' }));
    const decoded = decodeShare(encoded);
    expect(decoded!.taxTipSplitMode).toBe('even');
  });

  it('round-trips a zero discount', () => {
    const encoded = encodeShare(snapshot({ discount: 0 }));
    const decoded = decodeShare(encoded);
    expect(decoded!.discount).toBe(0);
    expect(decoded!.discountMode).toBe('amount');
  });

  it('round-trips a percentage discount mode', () => {
    const encoded = encodeShare(snapshot({ discount: 15, discountMode: 'percent' }));
    const decoded = decodeShare(encoded);
    expect(decoded!.discount).toBe(15);
    expect(decoded!.discountMode).toBe('percent');
  });

  it('defaults discountMode to "amount" for links encoded before the field existed', () => {
    // Simulates an older share link whose payload has no "dm" key.
    const legacy = { p: ['Alice'], i: [['Burger', 12, 1]], a: [[0]], t: 1, g: 2, d: 3, m: 0 };
    const bytes = new TextEncoder().encode(JSON.stringify(legacy));
    let binary = '';
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    const encoded = Buffer.from(binary, 'binary')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const decoded = decodeShare(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.discount).toBe(3);
    expect(decoded!.discountMode).toBe('amount');
  });

  it('round-trips an empty bill (no people, no items)', () => {
    const encoded = encodeShare(snapshot());
    const decoded = decodeShare(encoded);
    expect(decoded).toEqual(snapshot());
  });

  it('preserves unicode characters in names (emoji, accents)', () => {
    const people: Person[] = [{ id: 'p1', name: 'José 🍕' }];
    const encoded = encodeShare(snapshot({ people }));
    const decoded = decodeShare(encoded);
    expect(decoded!.people[0].name).toBe('José 🍕');
  });

  it('drops assignment entries pointing at a person that was not encoded', () => {
    // Defensive case: an assignment id that never resolved to a person index.
    const items: ReceiptItem[] = [{ id: 'i1', name: 'Solo', price: 5, quantity: 1 }];
    const assignments: Assignments = { i1: ['someone-not-in-people'] };
    const encoded = encodeShare(snapshot({ items, assignments }));
    const decoded = decodeShare(encoded);
    expect(decoded!.assignments[decoded!.items[0].id]).toEqual([]);
  });

  it('handles an item shared by many people', () => {
    const people: Person[] = Array.from({ length: 5 }, (_, i) => ({ id: `p${i}`, name: `Person ${i}` }));
    const items: ReceiptItem[] = [{ id: 'i1', name: 'Group Pizza', price: 25, quantity: 1 }];
    const assignments: Assignments = { i1: people.map((p) => p.id) };

    const decoded = decodeShare(encodeShare(snapshot({ people, items, assignments })))!;
    expect(decoded.assignments[decoded.items[0].id]).toHaveLength(5);
  });
});

describe('decodeShare error handling', () => {
  it('returns null for garbage input', () => {
    expect(decodeShare('not-valid-base64url-json!!!')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(decodeShare('')).toBeNull();
  });

  it('returns null when the decoded payload is missing required arrays', () => {
    // Manually encode `{}` the same way encodeShare would, minus the fields.
    const bytes = new TextEncoder().encode(JSON.stringify({ t: 0, g: 0, m: 0 }));
    let binary = '';
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    const encoded = Buffer.from(binary, 'binary')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    expect(decodeShare(encoded)).toBeNull();
  });
});
