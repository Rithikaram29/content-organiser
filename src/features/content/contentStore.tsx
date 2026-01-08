import React, { createContext, useContext, useMemo, useState } from "react";
import type { ContentItem } from "../../data/dbTypes";
import { fetchBacklog } from "./contentApi";

type ContentState = {
  items: ContentItem[];
  loading: boolean;
  refreshBacklog: () => Promise<void>;
  upsertItem: (item: ContentItem) => void;
  removeItem: (id: string) => void;
};

const ContentContext = createContext<ContentState | null>(null);

export function ContentStoreProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);

  async function refreshBacklog() {
    setLoading(true);
    try {
      const data = await fetchBacklog();
      setItems(data);
    } finally {
      setLoading(false);
    }
  }

  function upsertItem(item: ContentItem) {
    setItems((prev) => {
      const idx = prev.findIndex((x) => x.id === item.id);
      if (idx === -1) return [item, ...prev];
      const copy = prev.slice();
      copy[idx] = item;
      return copy;
    });
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((x) => x.id !== id));
  }

  const value = useMemo(
    () => ({ items, loading, refreshBacklog, upsertItem, removeItem }),
    [items, loading]
  );

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export function useContentStore() {
  const ctx = useContext(ContentContext);
  if (!ctx) throw new Error("useContentStore must be used inside ContentStoreProvider");
  return ctx;
}