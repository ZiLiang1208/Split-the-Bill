import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react';

import { billReducer, initialBillState, type BillState, type TaxTipSplitMode } from '@/lib/bill-reducer';

export type { Assignments, BillState, Person, ReceiptItem, TaxTipSplitMode } from '@/lib/bill-reducer';

type BillContextValue = BillState & {
  setImageUri: (uri: string | null) => void;
  setParsedReceipt: (data: { items: BillState['items']; tax: number; tip: number }) => void;
  setTax: (tax: number) => void;
  setTip: (tip: number) => void;
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

  const value = useMemo<BillContextValue>(
    () => ({
      ...state,
      setImageUri: (uri) => dispatch({ type: 'SET_IMAGE_URI', uri }),
      setParsedReceipt: ({ items, tax, tip }) => dispatch({ type: 'SET_PARSED_RECEIPT', items, tax, tip }),
      setTax: (tax) => dispatch({ type: 'SET_TAX', tax }),
      setTip: (tip) => dispatch({ type: 'SET_TIP', tip }),
      addItem: () => dispatch({ type: 'ADD_ITEM' }),
      updateItem: (id, patch) => dispatch({ type: 'UPDATE_ITEM', id, patch }),
      removeItem: (id) => dispatch({ type: 'REMOVE_ITEM', id }),
      splitItem: (id) => dispatch({ type: 'SPLIT_ITEM', id }),
      addPerson: (name) => dispatch({ type: 'ADD_PERSON', name }),
      removePerson: (id) => dispatch({ type: 'REMOVE_PERSON', id }),
      toggleAssignment: (itemId, personId) => dispatch({ type: 'TOGGLE_ASSIGNMENT', itemId, personId }),
      setTaxTipSplitMode: (mode) => dispatch({ type: 'SET_TAX_TIP_SPLIT_MODE', mode }),
      reset: () => dispatch({ type: 'RESET' }),
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
