import type { Assignments, DiscountMode, Person, ReceiptItem, TaxTipSplitMode } from '@/lib/bill-context';

/**
 * Turns a discount (either a flat dollar amount or a percentage of the
 * subtotal) into the dollar amount actually coming off the bill. Clamped to
 * [0, subtotal] — you can't discount more than the items cost.
 */
export function resolveDiscountAmount(
  subtotal: number,
  discount: number,
  discountMode: DiscountMode = 'amount'
): number {
  const raw = discountMode === 'percent' ? subtotal * (discount / 100) : discount;
  return Math.max(0, Math.min(raw, subtotal));
}

export type PersonItemShare = {
  item: ReceiptItem;
  shareOfPrice: number;
  splitBetween: number;
};

export type PersonTotal = {
  person: Person;
  items: PersonItemShare[];
  subtotal: number;
  discountShare: number;
  taxShare: number;
  tipShare: number;
  total: number;
};

export type SplitResult = {
  perPerson: PersonTotal[];
  unassignedItems: ReceiptItem[];
  subtotal: number;
  /** The dollar amount coming off the bill, after resolving any percentage. */
  discount: number;
  /** Set only when the discount was expressed as a percentage, for display. */
  discountPercent: number | null;
  tax: number;
  tip: number;
  total: number;
};

export function computeSplit(
  people: Person[],
  items: ReceiptItem[],
  assignments: Assignments,
  tax: number,
  tip: number,
  taxTipSplitMode: TaxTipSplitMode = 'even',
  discount: number = 0,
  discountMode: DiscountMode = 'amount'
): SplitResult {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const discountAmount = resolveDiscountAmount(subtotal, discount, discountMode);
  const unassignedItems = items.filter((item) => (assignments[item.id]?.length ?? 0) === 0);

  const perPersonSubtotal = new Map<string, number>();
  const perPersonItems = new Map<string, PersonItemShare[]>();
  for (const person of people) {
    perPersonSubtotal.set(person.id, 0);
    perPersonItems.set(person.id, []);
  }

  for (const item of items) {
    const assignedIds = assignments[item.id] ?? [];
    if (assignedIds.length === 0) continue;
    const shareOfPrice = item.price / assignedIds.length;
    for (const personId of assignedIds) {
      if (!perPersonSubtotal.has(personId)) continue;
      perPersonSubtotal.set(personId, (perPersonSubtotal.get(personId) ?? 0) + shareOfPrice);
      perPersonItems.get(personId)?.push({ item, shareOfPrice, splitBetween: assignedIds.length });
    }
  }

  const assignedSubtotal = subtotal - unassignedItems.reduce((sum, item) => sum + item.price, 0);

  const perPerson: PersonTotal[] = people.map((person) => {
    const personSubtotal = perPersonSubtotal.get(person.id) ?? 0;
    const subtotalProportion = assignedSubtotal > 0 ? personSubtotal / assignedSubtotal : 0;

    // Discount is always distributed by each person's share of what they
    // ordered — it's tied to the items purchased, not to headcount.
    const discountShare = discountAmount * subtotalProportion;

    let taxShare: number;
    let tipShare: number;
    if (taxTipSplitMode === 'even') {
      taxShare = people.length > 0 ? tax / people.length : 0;
      tipShare = people.length > 0 ? tip / people.length : 0;
    } else {
      taxShare = tax * subtotalProportion;
      tipShare = tip * subtotalProportion;
    }

    return {
      person,
      items: perPersonItems.get(person.id) ?? [],
      subtotal: personSubtotal,
      discountShare,
      taxShare,
      tipShare,
      total: personSubtotal - discountShare + taxShare + tipShare,
    };
  });

  return {
    perPerson,
    unassignedItems,
    subtotal,
    discount: discountAmount,
    discountPercent: discountMode === 'percent' && discount > 0 ? discount : null,
    tax,
    tip,
    total: subtotal - discountAmount + tax + tip,
  };
}
