import type { Assignments, Person, ReceiptItem } from '@/lib/bill-context';
import { computeSplit, resolveDiscountAmount } from '@/lib/split';

function person(id: string, name: string): Person {
  return { id, name };
}

function item(id: string, name: string, price: number, quantity = 1): ReceiptItem {
  return { id, name, price, quantity };
}

describe('computeSplit', () => {
  it('splits a single item cost fully to the one person assigned to it', () => {
    const people = [person('p1', 'Alice')];
    const items = [item('i1', 'Burger', 12)];
    const assignments: Assignments = { i1: ['p1'] };

    const result = computeSplit(people, items, assignments, 0, 0);

    expect(result.perPerson).toHaveLength(1);
    expect(result.perPerson[0].subtotal).toBe(12);
    expect(result.perPerson[0].total).toBe(12);
    expect(result.unassignedItems).toHaveLength(0);
  });

  it('splits a shared item cost evenly between everyone assigned to it', () => {
    const people = [person('p1', 'Alice'), person('p2', 'Bob')];
    const items = [item('i1', 'Pizza', 20)];
    const assignments: Assignments = { i1: ['p1', 'p2'] };

    const result = computeSplit(people, items, assignments, 0, 0);

    const alice = result.perPerson.find((p) => p.person.id === 'p1')!;
    const bob = result.perPerson.find((p) => p.person.id === 'p2')!;
    expect(alice.subtotal).toBe(10);
    expect(bob.subtotal).toBe(10);
    expect(alice.items[0]).toMatchObject({ shareOfPrice: 10, splitBetween: 2 });
  });

  it('excludes unassigned items from every person\'s subtotal and lists them separately', () => {
    const people = [person('p1', 'Alice')];
    const items = [item('i1', 'Burger', 12), item('i2', 'Fries', 5)];
    const assignments: Assignments = { i1: ['p1'] }; // i2 left unassigned

    const result = computeSplit(people, items, assignments, 0, 0);

    expect(result.unassignedItems).toEqual([items[1]]);
    expect(result.perPerson[0].subtotal).toBe(12);
    // Receipt-level subtotal still includes the unassigned item.
    expect(result.subtotal).toBe(17);
  });

  describe('taxTipSplitMode: "even" (default)', () => {
    it('divides tax and tip equally across everyone, including people with $0 in items', () => {
      const people = [person('p1', 'Alice'), person('p2', 'Bob')];
      const items = [item('i1', 'Mango', 4)];
      const assignments: Assignments = { i1: ['p1'] }; // only Alice ordered anything

      const result = computeSplit(people, items, assignments, 2, 0, 'even');

      const alice = result.perPerson.find((p) => p.person.id === 'p1')!;
      const bob = result.perPerson.find((p) => p.person.id === 'p2')!;
      expect(alice.taxShare).toBe(1);
      expect(bob.taxShare).toBe(1);
      expect(bob.subtotal).toBe(0);
      expect(bob.total).toBe(1);
    });

    it('is the default when taxTipSplitMode is omitted', () => {
      const people = [person('p1', 'Alice'), person('p2', 'Bob')];
      const items = [item('i1', 'Mango', 4)];
      const assignments: Assignments = { i1: ['p1'] };

      const result = computeSplit(people, items, assignments, 2, 0);

      const bob = result.perPerson.find((p) => p.person.id === 'p2')!;
      expect(bob.taxShare).toBe(1);
    });

    it('returns $0 tax/tip per person when there are no people', () => {
      const items = [item('i1', 'Mango', 4)];
      const result = computeSplit([], items, {}, 2, 1, 'even');
      expect(result.perPerson).toEqual([]);
      // Receipt-level totals are unaffected by there being no people.
      expect(result.total).toBe(7);
    });
  });

  describe('taxTipSplitMode: "proportional"', () => {
    it('gives $0 tax/tip to a person who ordered nothing', () => {
      const people = [person('p1', 'Alice'), person('p2', 'Bob')];
      const items = [item('i1', 'Mango', 4)];
      const assignments: Assignments = { i1: ['p1'] };

      const result = computeSplit(people, items, assignments, 2, 0, 'proportional');

      const alice = result.perPerson.find((p) => p.person.id === 'p1')!;
      const bob = result.perPerson.find((p) => p.person.id === 'p2')!;
      expect(alice.taxShare).toBe(2);
      expect(bob.taxShare).toBe(0);
      expect(bob.total).toBe(0);
    });

    it('splits tax/tip proportionally to each person\'s share of the assigned subtotal', () => {
      const people = [person('p1', 'Alice'), person('p2', 'Bob')];
      const items = [item('i1', 'Steak', 30), item('i2', 'Salad', 10)];
      const assignments: Assignments = { i1: ['p1'], i2: ['p2'] };

      const result = computeSplit(people, items, assignments, 8, 0, 'proportional');

      const alice = result.perPerson.find((p) => p.person.id === 'p1')!;
      const bob = result.perPerson.find((p) => p.person.id === 'p2')!;
      // Alice: 30/40 = 75% of tax => 6. Bob: 10/40 = 25% => 2.
      expect(alice.taxShare).toBeCloseTo(6);
      expect(bob.taxShare).toBeCloseTo(2);
    });

    it('does not divide by zero when no items are assigned to anyone', () => {
      const people = [person('p1', 'Alice')];
      const items = [item('i1', 'Mango', 4)];
      const assignments: Assignments = {}; // nothing assigned

      const result = computeSplit(people, items, assignments, 2, 1, 'proportional');

      expect(result.perPerson[0].taxShare).toBe(0);
      expect(result.perPerson[0].tipShare).toBe(0);
      expect(result.perPerson[0].total).toBe(0);
      expect(result.unassignedItems).toEqual(items);
    });
  });

  it('computes receipt-level totals as subtotal + tax + tip regardless of assignment state', () => {
    const items = [item('i1', 'A', 10), item('i2', 'B', 5)];
    const result = computeSplit([], items, {}, 3, 2);
    expect(result.subtotal).toBe(15);
    expect(result.tax).toBe(3);
    expect(result.tip).toBe(2);
    expect(result.total).toBe(20);
  });

  describe('discount', () => {
    it('reduces the receipt-level total: subtotal - discount + tax + tip', () => {
      const items = [item('i1', 'A', 10), item('i2', 'B', 5)];
      const result = computeSplit([], items, {}, 3, 2, 'even', 4);
      expect(result.subtotal).toBe(15);
      expect(result.discount).toBe(4);
      expect(result.total).toBe(15 - 4 + 3 + 2);
    });

    it('is distributed proportionally to each person\'s share of the subtotal, regardless of taxTipSplitMode', () => {
      const people = [person('p1', 'Alice'), person('p2', 'Bob')];
      const items = [item('i1', 'Steak', 30), item('i2', 'Salad', 10)];
      const assignments: Assignments = { i1: ['p1'], i2: ['p2'] };

      // Even tax/tip mode should not change how discount is distributed.
      const evenResult = computeSplit(people, items, assignments, 0, 0, 'even', 8);
      const alice = evenResult.perPerson.find((p) => p.person.id === 'p1')!;
      const bob = evenResult.perPerson.find((p) => p.person.id === 'p2')!;
      // Alice: 30/40 = 75% of discount => 6. Bob: 10/40 = 25% => 2.
      expect(alice.discountShare).toBeCloseTo(6);
      expect(bob.discountShare).toBeCloseTo(2);

      const proportionalResult = computeSplit(people, items, assignments, 0, 0, 'proportional', 8);
      const aliceP = proportionalResult.perPerson.find((p) => p.person.id === 'p1')!;
      const bobP = proportionalResult.perPerson.find((p) => p.person.id === 'p2')!;
      expect(aliceP.discountShare).toBeCloseTo(6);
      expect(bobP.discountShare).toBeCloseTo(2);
    });

    it('reduces each person\'s total by their discount share', () => {
      const people = [person('p1', 'Alice')];
      const items = [item('i1', 'Burger', 20)];
      const assignments: Assignments = { i1: ['p1'] };

      const result = computeSplit(people, items, assignments, 0, 0, 'even', 5);

      expect(result.perPerson[0].discountShare).toBe(5);
      expect(result.perPerson[0].total).toBe(15);
    });

    it('gives $0 discount share to a person who ordered nothing', () => {
      const people = [person('p1', 'Alice'), person('p2', 'Bob')];
      const items = [item('i1', 'Mango', 4)];
      const assignments: Assignments = { i1: ['p1'] };

      const result = computeSplit(people, items, assignments, 0, 0, 'even', 2);

      const bob = result.perPerson.find((p) => p.person.id === 'p2')!;
      expect(bob.discountShare).toBe(0);
    });

    it('does not divide by zero when no items are assigned to anyone', () => {
      const people = [person('p1', 'Alice')];
      const items = [item('i1', 'Mango', 4)];

      const result = computeSplit(people, items, {}, 0, 0, 'even', 3);

      expect(result.perPerson[0].discountShare).toBe(0);
    });

    it('defaults to 0 when omitted', () => {
      const items = [item('i1', 'A', 10)];
      const result = computeSplit([], items, {}, 0, 0);
      expect(result.discount).toBe(0);
      expect(result.discountPercent).toBeNull();
      expect(result.total).toBe(10);
    });
  });

  describe('percentage discounts', () => {
    it('resolves a percentage against the subtotal', () => {
      const items = [item('i1', 'A', 80), item('i2', 'B', 20)];
      const result = computeSplit([], items, {}, 0, 0, 'even', 10, 'percent');
      // 10% of the $100 subtotal.
      expect(result.discount).toBe(10);
      expect(result.discountPercent).toBe(10);
      expect(result.total).toBe(90);
    });

    it('reports discountPercent as null in amount mode', () => {
      const items = [item('i1', 'A', 100)];
      const result = computeSplit([], items, {}, 0, 0, 'even', 10, 'amount');
      expect(result.discount).toBe(10);
      expect(result.discountPercent).toBeNull();
    });

    it('distributes a percentage discount proportionally, same as a flat amount', () => {
      const people = [person('p1', 'Alice'), person('p2', 'Bob')];
      const items = [item('i1', 'Steak', 30), item('i2', 'Salad', 10)];
      const assignments: Assignments = { i1: ['p1'], i2: ['p2'] };

      // 20% of $40 = $8, split 75/25 => 6 / 2.
      const result = computeSplit(people, items, assignments, 0, 0, 'even', 20, 'percent');

      expect(result.discount).toBeCloseTo(8);
      expect(result.perPerson.find((p) => p.person.id === 'p1')!.discountShare).toBeCloseTo(6);
      expect(result.perPerson.find((p) => p.person.id === 'p2')!.discountShare).toBeCloseTo(2);
    });

    it('clamps a discount larger than the subtotal so the total never goes negative', () => {
      const items = [item('i1', 'A', 10)];
      const overAmount = computeSplit([], items, {}, 0, 0, 'even', 50, 'amount');
      expect(overAmount.discount).toBe(10);
      expect(overAmount.total).toBe(0);

      const overPercent = computeSplit([], items, {}, 0, 0, 'even', 150, 'percent');
      expect(overPercent.discount).toBe(10);
      expect(overPercent.total).toBe(0);
    });

    it('never produces a negative discount', () => {
      const items = [item('i1', 'A', 10)];
      const result = computeSplit([], items, {}, 0, 0, 'even', -5, 'amount');
      expect(result.discount).toBe(0);
    });
  });

  describe('resolveDiscountAmount', () => {
    it('passes a flat amount straight through', () => {
      expect(resolveDiscountAmount(100, 15, 'amount')).toBe(15);
    });

    it('converts a percentage against the subtotal', () => {
      expect(resolveDiscountAmount(200, 25, 'percent')).toBe(50);
    });

    it('defaults to amount mode', () => {
      expect(resolveDiscountAmount(100, 15)).toBe(15);
    });

    it('clamps to the subtotal and to zero', () => {
      expect(resolveDiscountAmount(10, 999, 'amount')).toBe(10);
      expect(resolveDiscountAmount(10, 200, 'percent')).toBe(10);
      expect(resolveDiscountAmount(10, -3, 'amount')).toBe(0);
    });

    it('returns 0 for a $0 subtotal rather than NaN', () => {
      expect(resolveDiscountAmount(0, 10, 'percent')).toBe(0);
      expect(resolveDiscountAmount(0, 10, 'amount')).toBe(0);
    });
  });

  it('handles an item split three ways with a non-terminating decimal share', () => {
    const people = [person('p1', 'A'), person('p2', 'B'), person('p3', 'C')];
    const items = [item('i1', 'Pizza', 10)];
    const assignments: Assignments = { i1: ['p1', 'p2', 'p3'] };

    const result = computeSplit(people, items, assignments, 0, 0);

    for (const p of result.perPerson) {
      expect(p.subtotal).toBeCloseTo(10 / 3);
    }
    const sum = result.perPerson.reduce((s, p) => s + p.subtotal, 0);
    expect(sum).toBeCloseTo(10);
  });
});
