import type { Assignments, Person, ReceiptItem, TaxTipSplitMode } from '@/lib/bill-context';

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
  discount: number;
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
  discount: number = 0
): SplitResult {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
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
    const discountShare = discount * subtotalProportion;

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
    discount,
    tax,
    tip,
    total: subtotal - discount + tax + tip,
  };
}
