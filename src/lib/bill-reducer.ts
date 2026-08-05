export type ReceiptItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

export type Person = {
  id: string;
  name: string;
};

// Maps item id -> set of person ids the item's cost is split across.
export type Assignments = Record<string, string[]>;

export type TaxTipSplitMode = 'even' | 'proportional';

/** Whether `discount` is a flat dollar amount or a percentage of the subtotal. */
export type DiscountMode = 'amount' | 'percent';

export type BillState = {
  imageUri: string | null;
  items: ReceiptItem[];
  tax: number;
  tip: number;
  discount: number;
  discountMode: DiscountMode;
  people: Person[];
  assignments: Assignments;
  taxTipSplitMode: TaxTipSplitMode;
};

export type BillAction =
  | { type: 'SET_IMAGE_URI'; uri: string | null }
  | {
      type: 'SET_PARSED_RECEIPT';
      items: ReceiptItem[];
      tax: number;
      tip: number;
      discount: number;
      discountMode: DiscountMode;
    }
  | { type: 'SET_TAX'; tax: number }
  | { type: 'SET_TIP'; tip: number }
  | { type: 'SET_DISCOUNT'; discount: number }
  | { type: 'SET_DISCOUNT_MODE'; mode: DiscountMode }
  | { type: 'ADD_ITEM' }
  | { type: 'UPDATE_ITEM'; id: string; patch: Partial<Omit<ReceiptItem, 'id'>> }
  | { type: 'REMOVE_ITEM'; id: string }
  | { type: 'SPLIT_ITEM'; id: string }
  | { type: 'ADD_PERSON'; name: string }
  | { type: 'REMOVE_PERSON'; id: string }
  | { type: 'TOGGLE_ASSIGNMENT'; itemId: string; personId: string }
  | { type: 'SET_TAX_TIP_SPLIT_MODE'; mode: TaxTipSplitMode }
  | { type: 'RESET' }
  | { type: 'HYDRATE'; state: Partial<BillState> };

export const initialBillState: BillState = {
  imageUri: null,
  items: [],
  tax: 0,
  tip: 0,
  discount: 0,
  discountMode: 'amount',
  people: [],
  assignments: {},
  taxTipSplitMode: 'even',
};

function omitKey<T extends Record<string, unknown>>(obj: T, key: string): T {
  const { [key]: _removed, ...rest } = obj;
  return rest as T;
}

export function billReducer(state: BillState, action: BillAction): BillState {
  switch (action.type) {
    case 'SET_IMAGE_URI':
      return { ...state, imageUri: action.uri };

    case 'SET_PARSED_RECEIPT':
      return {
        ...state,
        items: action.items,
        tax: action.tax,
        tip: action.tip,
        discount: action.discount,
        discountMode: action.discountMode,
        assignments: {},
      };

    case 'SET_TAX':
      return { ...state, tax: action.tax };

    case 'SET_TIP':
      return { ...state, tip: action.tip };

    case 'SET_DISCOUNT':
      return { ...state, discount: action.discount };

    case 'SET_DISCOUNT_MODE':
      return { ...state, discountMode: action.mode };

    case 'ADD_ITEM':
      return {
        ...state,
        items: [
          ...state.items,
          {
            id: `item-${Date.now()}-${state.items.length}`,
            name: 'New item',
            price: 0,
            quantity: 1,
          },
        ],
      };

    case 'UPDATE_ITEM':
      return {
        ...state,
        items: state.items.map((item) => (item.id === action.id ? { ...item, ...action.patch } : item)),
      };

    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.id),
        assignments: omitKey(state.assignments, action.id),
      };

    case 'SPLIT_ITEM': {
      const index = state.items.findIndex((item) => item.id === action.id);
      const item = state.items[index];
      if (!item || item.quantity <= 1) return state;

      const unitPrice = Math.round((item.price / item.quantity) * 100) / 100;
      const splitItems: ReceiptItem[] = Array.from({ length: item.quantity }, (_, i) => ({
        id: `${item.id}-split-${i}-${Date.now()}`,
        name: item.name,
        price: unitPrice,
        quantity: 1,
      }));

      const items = [...state.items];
      items.splice(index, 1, ...splitItems);

      return { ...state, items, assignments: omitKey(state.assignments, action.id) };
    }

    case 'ADD_PERSON':
      return {
        ...state,
        people: [...state.people, { id: `${Date.now()}-${state.people.length}`, name: action.name }],
      };

    case 'REMOVE_PERSON':
      return {
        ...state,
        people: state.people.filter((p) => p.id !== action.id),
        assignments: Object.fromEntries(
          Object.entries(state.assignments).map(([itemId, personIds]) => [
            itemId,
            personIds.filter((pid) => pid !== action.id),
          ])
        ),
      };

    case 'TOGGLE_ASSIGNMENT': {
      const current = state.assignments[action.itemId] ?? [];
      const next = current.includes(action.personId)
        ? current.filter((id) => id !== action.personId)
        : [...current, action.personId];
      return { ...state, assignments: { ...state.assignments, [action.itemId]: next } };
    }

    case 'SET_TAX_TIP_SPLIT_MODE':
      return { ...state, taxTipSplitMode: action.mode };

    case 'RESET':
      return initialBillState;

    case 'HYDRATE':
      // imageUri is intentionally never restored: a persisted blob:/file:
      // URI from a previous session is no longer valid, so keep whatever is
      // already in state (null, at the point hydration actually runs).
      return { ...state, ...action.state, imageUri: state.imageUri };

    default:
      return state;
  }
}
