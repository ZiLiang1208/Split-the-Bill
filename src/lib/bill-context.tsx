import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';

import {
  billReducer,
  initialBillState,
  type BillState,
  type DiscountMode,
  type TaxTipSplitMode,
} from '@/lib/bill-reducer';

export type {
  Assignments,
  BillState,
  DiscountMode,
  Person,
  ReceiptItem,
  TaxTipSplitMode,
} from '@/lib/bill-reducer';

const STORAGE_KEY = 'split-the-bill:state:v1';

type BillContextValue = BillState & {
  setImageUri: (uri: string | null) => void;
  setParsedReceipt: (data: {
    items: BillState['items'];
    tax: number;
    tip: number;
    discount: number;
    discountMode: DiscountMode;
  }) => void;
  setTax: (tax: number) => void;
  setTip: (tip: number) => void;
  setDiscount: (discount: number) => void;
  setDiscountMode: (mode: DiscountMode) => void;
  addItem: () => void;
  updateItem: (id: string, patch: Partial<Omit<BillState['items'][number], 'id'>>) => void;
  removeItem: (id: string) => void;
  splitItem: (id: string) => void;
  addPerson: (name: string) => void;
  removePerson: (id: string) => void;
  toggleAssignment: (itemId: string, personId: string) => void;
  setTaxTipSplitMode: (mode: TaxTipSplitMode) => void;
  reset: () => void;
};

const BillContext = createContext<BillContextValue | null>(null);

export function BillProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(billReducer, initialBillState);
  const hydratedRef = useRef(false);

  // Load any previously saved bill once on mount, so a page refresh (or
  // reopening the app) doesn't wipe out the user's progress.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as Partial<BillState>;
          dispatch({ type: 'HYDRATE', state: saved });
        }
      } catch {
        // Corrupt or unavailable storage — just start fresh.
      } finally {
        hydratedRef.current = true;
      }
    })();
  }, []);

  // Persist on every change, but only once the initial load above has had a
  // chance to run — otherwise the blank starting state would overwrite
  // whatever was saved before hydration completes.
  useEffect(() => {
    if (!hydratedRef.current) return;
    const { imageUri: _imageUri, ...persistable } = state;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(persistable)).catch(() => {});
  }, [state]);

  const value = useMemo<BillContextValue>(
    () => ({
      ...state,
      setImageUri: (uri) => dispatch({ type: 'SET_IMAGE_URI', uri }),
      setParsedReceipt: ({ items, tax, tip, discount, discountMode }) =>
        dispatch({ type: 'SET_PARSED_RECEIPT', items, tax, tip, discount, discountMode }),
      setTax: (tax) => dispatch({ type: 'SET_TAX', tax }),
      setTip: (tip) => dispatch({ type: 'SET_TIP', tip }),
      setDiscount: (discount) => dispatch({ type: 'SET_DISCOUNT', discount }),
      setDiscountMode: (mode) => dispatch({ type: 'SET_DISCOUNT_MODE', mode }),
      addItem: () => dispatch({ type: 'ADD_ITEM' }),
      updateItem: (id, patch) => dispatch({ type: 'UPDATE_ITEM', id, patch }),
      removeItem: (id) => dispatch({ type: 'REMOVE_ITEM', id }),
      splitItem: (id) => dispatch({ type: 'SPLIT_ITEM', id }),
      addPerson: (name) => dispatch({ type: 'ADD_PERSON', name }),
      removePerson: (id) => dispatch({ type: 'REMOVE_PERSON', id }),
      toggleAssignment: (itemId, personId) => dispatch({ type: 'TOGGLE_ASSIGNMENT', itemId, personId }),
      setTaxTipSplitMode: (mode) => dispatch({ type: 'SET_TAX_TIP_SPLIT_MODE', mode }),
      reset: () => {
        AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
        dispatch({ type: 'RESET' });
      },
    }),
    [state]
  );

  return <BillContext.Provider value={value}>{children}</BillContext.Provider>;
}

export function useBill() {
  const ctx = useContext(BillContext);
  if (!ctx) throw new Error('useBill must be used within a BillProvider');
  return ctx;
}
