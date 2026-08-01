"use client";

import { createContext, useContext, useMemo, useReducer } from "react";
import type { Product } from "@/data/products";

type CartItem = Product & { quantity: number };
type CartState = { items: CartItem[] };

type CartContextValue = CartState & {
  addItem: (product: Product) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
};

type Action =
  | { type: "add"; product: Product }
  | { type: "remove"; id: string }
  | { type: "update"; id: string; quantity: number }
  | { type: "clear" };

const CartContext = createContext<CartContextValue | null>(null);

function cartReducer(state: CartState, action: Action): CartState {
  switch (action.type) {
    case "add": {
      const existing = state.items.find((item) => item.id === action.product.id);
      if (existing) {
        return {
          items: state.items.map((item) =>
            item.id === action.product.id ? { ...item, quantity: item.quantity + 1 } : item,
          ),
        };
      }
      return { items: [...state.items, { ...action.product, quantity: 1 }] };
    }
    case "remove":
      return { items: state.items.filter((item) => item.id !== action.id) };
    case "update":
      if (action.quantity <= 0) {
        return { items: state.items.filter((item) => item.id !== action.id) };
      }
      return {
        items: state.items.map((item) =>
          item.id === action.id ? { ...item, quantity: action.quantity } : item,
        ),
      };
    case "clear":
      return { items: [] };
    default:
      return state;
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });

  const value = useMemo<CartContextValue>(() => {
    const itemCount = state.items.reduce((total, item) => total + item.quantity, 0);
    const subtotal = state.items.reduce((total, item) => total + item.price * item.quantity, 0);

    return {
      ...state,
      itemCount,
      subtotal,
      addItem: (product) => dispatch({ type: "add", product }),
      removeItem: (id) => dispatch({ type: "remove", id }),
      updateQuantity: (id, quantity) => dispatch({ type: "update", id, quantity }),
      clearCart: () => dispatch({ type: "clear" }),
    };
  }, [state]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }
  return context;
}
