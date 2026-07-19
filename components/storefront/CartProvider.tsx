"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type CartItem = {
  productId: string;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  addItem: (productId: string, quantity?: number) => void;
  updateItemQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
};

const CART_STORAGE_KEY = "ashe-tokun-public-cart-v1";
const CartContext = createContext<CartContextValue | null>(null);

function normalizeItems(value: unknown): CartItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const itemsByProduct = new Map<string, number>();

  for (const item of value) {
    if (
      !item ||
      typeof item !== "object" ||
      !("productId" in item) ||
      typeof item.productId !== "string"
    ) {
      continue;
    }

    const quantity =
      "quantity" in item && typeof item.quantity === "number"
        ? Math.floor(item.quantity)
        : 0;

    if (Number.isFinite(quantity) && quantity > 0) {
      itemsByProduct.set(
        item.productId,
        Math.min(99, (itemsByProduct.get(item.productId) ?? 0) + quantity),
      );
    }
  }

  return Array.from(itemsByProduct.entries()).map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    try {
      const storedCart = window.localStorage.getItem(CART_STORAGE_KEY);

      if (storedCart) {
        return normalizeItems(JSON.parse(storedCart));
      }
    } catch {
      return [];
    }

    return [];
  });

  useEffect(() => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((productId: string, quantity = 1) => {
    const parsedQuantity = Math.floor(quantity);
    const safeQuantity = Number.isFinite(parsedQuantity)
      ? Math.max(1, parsedQuantity)
      : 1;

    setItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.productId === productId);

      if (!existingItem) {
        return [...currentItems, { productId, quantity: Math.min(99, safeQuantity) }];
      }

      return currentItems.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.min(99, item.quantity + safeQuantity) }
          : item,
      );
    });
  }, []);

  const updateItemQuantity = useCallback((productId: string, quantity: number) => {
    const safeQuantity = Math.floor(quantity);

    setItems((currentItems) => {
      if (!Number.isFinite(safeQuantity) || safeQuantity <= 0) {
        return currentItems.filter((item) => item.productId !== productId);
      }

      return currentItems.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.min(99, safeQuantity) }
          : item,
      );
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((currentItems) =>
      currentItems.filter((item) => item.productId !== productId),
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const value = useMemo(
    () => ({
      items,
      itemCount: items.reduce((total, item) => total + item.quantity, 0),
      addItem,
      updateItemQuantity,
      removeItem,
      clearCart,
    }),
    [addItem, clearCart, items, removeItem, updateItemQuantity],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }

  return context;
}

export function useCartItemCount() {
  return useContext(CartContext)?.itemCount ?? 0;
}
