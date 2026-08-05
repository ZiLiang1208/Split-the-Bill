import { billReducer, initialBillState, type BillState } from '@/lib/bill-reducer';

function withItems(items: BillState['items']): BillState {
  return { ...initialBillState, items };
}

function withPeople(people: BillState['people']): BillState {
  return { ...initialBillState, people };
}

describe('billReducer', () => {
  describe('SET_IMAGE_URI', () => {
    it('sets and clears the image uri', () => {
      let state = billReducer(initialBillState, { type: 'SET_IMAGE_URI', uri: 'file://receipt.jpg' });
      expect(state.imageUri).toBe('file://receipt.jpg');
      state = billReducer(state, { type: 'SET_IMAGE_URI', uri: null });
      expect(state.imageUri).toBeNull();
    });
  });

  describe('SET_PARSED_RECEIPT', () => {
    it('replaces items/tax/tip/discount and clears any prior assignments', () => {
      const before: BillState = {
        ...initialBillState,
        items: [{ id: 'old', name: 'Old', price: 1, quantity: 1 }],
        assignments: { old: ['p1'] },
      };
      const items = [{ id: 'i1', name: 'Burger', price: 12, quantity: 1 }];

      const state = billReducer(before, {
        type: 'SET_PARSED_RECEIPT',
        items,
        tax: 2,
        tip: 3,
        discount: 4,
        discountMode: 'amount',
      });

      expect(state.items).toEqual(items);
      expect(state.tax).toBe(2);
      expect(state.tip).toBe(3);
      expect(state.discount).toBe(4);
      expect(state.discountMode).toBe('amount');
      expect(state.assignments).toEqual({});
    });

    it('carries a percentage discount mode through from the parser', () => {
      const state = billReducer(initialBillState, {
        type: 'SET_PARSED_RECEIPT',
        items: [],
        tax: 0,
        tip: 0,
        discount: 10,
        discountMode: 'percent',
      });
      expect(state.discount).toBe(10);
      expect(state.discountMode).toBe('percent');
    });
  });

  describe('SET_TAX / SET_TIP / SET_DISCOUNT / SET_DISCOUNT_MODE', () => {
    it('defaults discount to 0 in "amount" mode', () => {
      expect(initialBillState.discount).toBe(0);
      expect(initialBillState.discountMode).toBe('amount');
    });

    it('updates tax, tip, and discount independently', () => {
      let state = billReducer(initialBillState, { type: 'SET_TAX', tax: 4.5 });
      state = billReducer(state, { type: 'SET_TIP', tip: 6 });
      state = billReducer(state, { type: 'SET_DISCOUNT', discount: 3 });
      expect(state.tax).toBe(4.5);
      expect(state.tip).toBe(6);
      expect(state.discount).toBe(3);
    });

    it('toggles discount mode without disturbing the entered value', () => {
      let state = billReducer(initialBillState, { type: 'SET_DISCOUNT', discount: 15 });
      state = billReducer(state, { type: 'SET_DISCOUNT_MODE', mode: 'percent' });
      expect(state.discountMode).toBe('percent');
      expect(state.discount).toBe(15);
      state = billReducer(state, { type: 'SET_DISCOUNT_MODE', mode: 'amount' });
      expect(state.discountMode).toBe('amount');
      expect(state.discount).toBe(15);
    });
  });

  describe('ADD_ITEM', () => {
    it('appends a default "New item" with quantity 1 and price 0', () => {
      const state = billReducer(initialBillState, { type: 'ADD_ITEM' });
      expect(state.items).toHaveLength(1);
      expect(state.items[0]).toMatchObject({ name: 'New item', price: 0, quantity: 1 });
      expect(state.items[0].id).toBeTruthy();
    });

    it('assigns unique ids across multiple adds', () => {
      let state = billReducer(initialBillState, { type: 'ADD_ITEM' });
      state = billReducer(state, { type: 'ADD_ITEM' });
      expect(state.items).toHaveLength(2);
      expect(state.items[0].id).not.toBe(state.items[1].id);
    });
  });

  describe('UPDATE_ITEM', () => {
    it('patches only the matching item, leaving others untouched', () => {
      const before = withItems([
        { id: 'i1', name: 'A', price: 1, quantity: 1 },
        { id: 'i2', name: 'B', price: 2, quantity: 1 },
      ]);

      const state = billReducer(before, { type: 'UPDATE_ITEM', id: 'i1', patch: { name: 'Apple', price: 3 } });

      expect(state.items[0]).toEqual({ id: 'i1', name: 'Apple', price: 3, quantity: 1 });
      expect(state.items[1]).toEqual(before.items[1]);
    });

    it('is a no-op for an id that does not exist', () => {
      const before = withItems([{ id: 'i1', name: 'A', price: 1, quantity: 1 }]);
      const state = billReducer(before, { type: 'UPDATE_ITEM', id: 'missing', patch: { name: 'X' } });
      expect(state.items).toEqual(before.items);
    });
  });

  describe('REMOVE_ITEM', () => {
    it('removes the item and its assignment entry', () => {
      const before: BillState = {
        ...withItems([
          { id: 'i1', name: 'A', price: 1, quantity: 1 },
          { id: 'i2', name: 'B', price: 2, quantity: 1 },
        ]),
        assignments: { i1: ['p1'], i2: ['p2'] },
      };

      const state = billReducer(before, { type: 'REMOVE_ITEM', id: 'i1' });

      expect(state.items.map((i) => i.id)).toEqual(['i2']);
      expect(state.assignments).toEqual({ i2: ['p2'] });
    });
  });

  describe('SPLIT_ITEM', () => {
    it('splits a quantity-2 item into two quantity-1 items at half the price', () => {
      const before = withItems([{ id: 'i1', name: 'Mango', price: 4, quantity: 2 }]);

      const state = billReducer(before, { type: 'SPLIT_ITEM', id: 'i1' });

      expect(state.items).toHaveLength(2);
      for (const item of state.items) {
        expect(item.name).toBe('Mango');
        expect(item.quantity).toBe(1);
        expect(item.price).toBe(2);
      }
      // Split items must get distinct ids so they can be assigned independently.
      expect(state.items[0].id).not.toBe(state.items[1].id);
    });

    it('preserves position in the list relative to other items', () => {
      const before = withItems([
        { id: 'i0', name: 'Before', price: 1, quantity: 1 },
        { id: 'i1', name: 'Mango', price: 4, quantity: 2 },
        { id: 'i2', name: 'After', price: 1, quantity: 1 },
      ]);

      const state = billReducer(before, { type: 'SPLIT_ITEM', id: 'i1' });

      expect(state.items.map((i) => i.name)).toEqual(['Before', 'Mango', 'Mango', 'After']);
    });

    it('clears the original item\'s assignments since it no longer exists', () => {
      const before: BillState = {
        ...withItems([{ id: 'i1', name: 'Mango', price: 4, quantity: 2 }]),
        assignments: { i1: ['p1', 'p2'] },
      };

      const state = billReducer(before, { type: 'SPLIT_ITEM', id: 'i1' });

      expect(state.assignments).toEqual({});
    });

    it('is a no-op when quantity is 1', () => {
      const before = withItems([{ id: 'i1', name: 'Solo', price: 4, quantity: 1 }]);
      const state = billReducer(before, { type: 'SPLIT_ITEM', id: 'i1' });
      expect(state).toBe(before);
    });

    it('is a no-op for an id that does not exist', () => {
      const before = withItems([{ id: 'i1', name: 'Solo', price: 4, quantity: 2 }]);
      const state = billReducer(before, { type: 'SPLIT_ITEM', id: 'missing' });
      expect(state).toBe(before);
    });

    it('rounds unit price to the nearest cent for an uneven split', () => {
      // $10 split 3 ways = $3.33 each (drifts 1 cent from the original total,
      // which is expected/acceptable rounding behavior for cash splitting).
      const before = withItems([{ id: 'i1', name: 'Split3', price: 10, quantity: 3 }]);
      const state = billReducer(before, { type: 'SPLIT_ITEM', id: 'i1' });
      expect(state.items.map((i) => i.price)).toEqual([3.33, 3.33, 3.33]);
    });
  });

  describe('ADD_PERSON / REMOVE_PERSON', () => {
    it('adds a person with the given name', () => {
      const state = billReducer(initialBillState, { type: 'ADD_PERSON', name: 'Alice' });
      expect(state.people).toHaveLength(1);
      expect(state.people[0].name).toBe('Alice');
      expect(state.people[0].id).toBeTruthy();
    });

    it('removes a person and strips them from every item\'s assignment list', () => {
      const before: BillState = {
        ...withPeople([
          { id: 'p1', name: 'Alice' },
          { id: 'p2', name: 'Bob' },
        ]),
        assignments: { i1: ['p1', 'p2'], i2: ['p1'] },
      };

      const state = billReducer(before, { type: 'REMOVE_PERSON', id: 'p1' });

      expect(state.people.map((p) => p.id)).toEqual(['p2']);
      expect(state.assignments).toEqual({ i1: ['p2'], i2: [] });
    });
  });

  describe('TOGGLE_ASSIGNMENT', () => {
    it('adds a person to an unassigned item', () => {
      const state = billReducer(initialBillState, {
        type: 'TOGGLE_ASSIGNMENT',
        itemId: 'i1',
        personId: 'p1',
      });
      expect(state.assignments).toEqual({ i1: ['p1'] });
    });

    it('removes a person who is already assigned (toggle off)', () => {
      const before: BillState = { ...initialBillState, assignments: { i1: ['p1', 'p2'] } };
      const state = billReducer(before, { type: 'TOGGLE_ASSIGNMENT', itemId: 'i1', personId: 'p1' });
      expect(state.assignments).toEqual({ i1: ['p2'] });
    });

    it('supports assigning the same item to multiple people', () => {
      let state = billReducer(initialBillState, {
        type: 'TOGGLE_ASSIGNMENT',
        itemId: 'i1',
        personId: 'p1',
      });
      state = billReducer(state, { type: 'TOGGLE_ASSIGNMENT', itemId: 'i1', personId: 'p2' });
      expect(state.assignments.i1).toEqual(['p1', 'p2']);
    });
  });

  describe('SET_TAX_TIP_SPLIT_MODE', () => {
    it('defaults to "even"', () => {
      expect(initialBillState.taxTipSplitMode).toBe('even');
    });

    it('switches to proportional and back', () => {
      let state = billReducer(initialBillState, { type: 'SET_TAX_TIP_SPLIT_MODE', mode: 'proportional' });
      expect(state.taxTipSplitMode).toBe('proportional');
      state = billReducer(state, { type: 'SET_TAX_TIP_SPLIT_MODE', mode: 'even' });
      expect(state.taxTipSplitMode).toBe('even');
    });
  });

  describe('RESET', () => {
    it('returns the initial state regardless of prior state', () => {
      const dirty: BillState = {
        imageUri: 'file://x.jpg',
        items: [{ id: 'i1', name: 'A', price: 1, quantity: 1 }],
        tax: 5,
        tip: 5,
        discount: 2,
        discountMode: 'percent',
        people: [{ id: 'p1', name: 'Alice' }],
        assignments: { i1: ['p1'] },
        taxTipSplitMode: 'proportional',
      };
      const state = billReducer(dirty, { type: 'RESET' });
      expect(state).toEqual(initialBillState);
    });
  });

  describe('HYDRATE', () => {
    it('merges saved fields on top of the current state', () => {
      const saved = {
        people: [{ id: 'p1', name: 'Alice' }],
        items: [{ id: 'i1', name: 'Burger', price: 12, quantity: 1 }],
        tax: 2,
        tip: 3,
        discount: 5,
        discountMode: 'percent' as const,
        assignments: { i1: ['p1'] },
        taxTipSplitMode: 'proportional' as const,
      };

      const state = billReducer(initialBillState, { type: 'HYDRATE', state: saved });

      expect(state.people).toEqual(saved.people);
      expect(state.items).toEqual(saved.items);
      expect(state.tax).toBe(2);
      expect(state.discount).toBe(5);
      expect(state.discountMode).toBe('percent');
      expect(state.taxTipSplitMode).toBe('proportional');
    });

    it('never restores imageUri, even if present in the saved payload', () => {
      const before: BillState = { ...initialBillState, imageUri: null };
      const state = billReducer(before, {
        type: 'HYDRATE',
        state: { imageUri: 'file://stale-blob-url.jpg', tax: 4 },
      });
      expect(state.imageUri).toBeNull();
      expect(state.tax).toBe(4);
    });

    it('leaves fields not present in the saved payload untouched', () => {
      const before: BillState = { ...initialBillState, tax: 9 };
      const state = billReducer(before, { type: 'HYDRATE', state: { tip: 2 } });
      expect(state.tax).toBe(9);
      expect(state.tip).toBe(2);
    });
  });
});
