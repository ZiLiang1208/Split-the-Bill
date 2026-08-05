import { Platform } from 'react-native';

import type { Assignments, DiscountMode, Person, ReceiptItem, TaxTipSplitMode } from '@/lib/bill-context';

const FALLBACK_WEB_URL = process.env.EXPO_PUBLIC_WEB_URL;

/**
 * Builds an absolute, visitable URL for a shared split.
 * On web this uses the current origin. On native it falls back to
 * EXPO_PUBLIC_WEB_URL (the deployed web build's URL), if configured, since a
 * friend needs a link that opens in a plain browser, not an app deep link.
 */
export function buildShareUrl(encoded: string): string | null {
  const path = `/shared?d=${encoded}`;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}${path}`;
  }
  return FALLBACK_WEB_URL ? `${FALLBACK_WEB_URL.replace(/\/$/, '')}${path}` : null;
}

export type ShareSnapshot = {
  people: Person[];
  items: ReceiptItem[];
  assignments: Assignments;
  tax: number;
  tip: number;
  discount: number;
  discountMode: DiscountMode;
  taxTipSplitMode: TaxTipSplitMode;
};

// Compact wire format: people/items are stored as arrays (position = index),
// and assignments reference people by index instead of by id, to keep the
// encoded URL as short as possible.
type CompactSnapshot = {
  p: string[]; // person names, index-addressed
  i: [name: string, price: number, quantity: number][]; // items, index-addressed
  a: number[][]; // per-item (same order as i) list of person indices
  t: number; // tax
  g: number; // tip ("gratuity", avoids colliding with tip/t)
  d: number; // discount (dollar amount, or percent when dm === 1)
  dm?: 0 | 1; // discount mode: 0 = amount, 1 = percent (absent on older links)
  m: 0 | 1; // 0 = even, 1 = proportional
};

const BASE64URL_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function bytesToBase64Url(bytes: Uint8Array): string {
  let output = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    const triplet = (b0 << 16) | ((b1 ?? 0) << 8) | (b2 ?? 0);
    output += BASE64URL_ALPHABET[(triplet >> 18) & 63];
    output += BASE64URL_ALPHABET[(triplet >> 12) & 63];
    output += b1 === undefined ? '' : BASE64URL_ALPHABET[(triplet >> 6) & 63];
    output += b2 === undefined ? '' : BASE64URL_ALPHABET[triplet & 63];
  }
  return output;
}

function base64UrlToBytes(input: string): Uint8Array {
  const clean = input.replace(/[^A-Za-z0-9\-_]/g, '');
  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    const chunk = clean.slice(i, i + 4);
    const values = chunk.split('').map((c) => BASE64URL_ALPHABET.indexOf(c));
    const triplet = (values[0] << 18) | ((values[1] ?? 0) << 12) | ((values[2] ?? 0) << 6) | (values[3] ?? 0);
    bytes.push((triplet >> 16) & 255);
    if (values[2] !== undefined) bytes.push((triplet >> 8) & 255);
    if (values[3] !== undefined) bytes.push(triplet & 255);
  }
  return new Uint8Array(bytes);
}

export function encodeShare(snapshot: ShareSnapshot): string {
  const personIndex = new Map(snapshot.people.map((p, i) => [p.id, i]));

  const compact: CompactSnapshot = {
    p: snapshot.people.map((p) => p.name),
    i: snapshot.items.map((it) => [it.name, it.price, it.quantity]),
    a: snapshot.items.map((it) =>
      (snapshot.assignments[it.id] ?? [])
        .map((personId) => personIndex.get(personId))
        .filter((idx): idx is number => idx !== undefined)
    ),
    t: snapshot.tax,
    g: snapshot.tip,
    d: snapshot.discount,
    dm: snapshot.discountMode === 'percent' ? 1 : 0,
    m: snapshot.taxTipSplitMode === 'proportional' ? 1 : 0,
  };

  const json = JSON.stringify(compact);
  const bytes = new TextEncoder().encode(json);
  return bytesToBase64Url(bytes);
}

export function decodeShare(encoded: string): ShareSnapshot | null {
  try {
    const bytes = base64UrlToBytes(encoded);
    const json = new TextDecoder().decode(bytes);
    const compact = JSON.parse(json) as CompactSnapshot;

    if (!Array.isArray(compact.p) || !Array.isArray(compact.i) || !Array.isArray(compact.a)) {
      return null;
    }

    const people: Person[] = compact.p.map((name, index) => ({ id: `p${index}`, name }));
    const items: ReceiptItem[] = compact.i.map(([name, price, quantity], index) => ({
      id: `i${index}`,
      name,
      price,
      quantity,
    }));
    const assignments: Assignments = {};
    compact.a.forEach((personIndices, itemIndex) => {
      const item = items[itemIndex];
      if (!item) return;
      assignments[item.id] = personIndices
        .map((personIdx) => people[personIdx]?.id)
        .filter((id): id is string => Boolean(id));
    });

    return {
      people,
      items,
      assignments,
      tax: typeof compact.t === 'number' ? compact.t : 0,
      tip: typeof compact.g === 'number' ? compact.g : 0,
      discount: typeof compact.d === 'number' ? compact.d : 0,
      discountMode: compact.dm === 1 ? 'percent' : 'amount',
      taxTipSplitMode: compact.m === 1 ? 'proportional' : 'even',
    };
  } catch {
    return null;
  }
}
