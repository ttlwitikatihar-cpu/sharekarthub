import { useEffect, useState, useCallback } from "react";

const KEY = "sharekart_wishlist";

const read = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
};

const write = (ids: string[]) => {
  localStorage.setItem(KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event("wishlist-changed"));
};

export const useWishlist = () => {
  const [ids, setIds] = useState<string[]>(() => read());

  useEffect(() => {
    const sync = () => setIds(read());
    window.addEventListener("wishlist-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("wishlist-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggle = useCallback((id: string) => {
    const current = read();
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    write(next);
    return next.includes(id);
  }, []);

  const has = useCallback((id: string) => ids.includes(id), [ids]);

  return { ids, has, toggle };
};

export const shareItem = async (opts: { title: string; text?: string; url: string }) => {
  try {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      await (navigator as any).share(opts);
      return "shared" as const;
    }
  } catch {
    /* user cancelled or unsupported */
  }
  try {
    await navigator.clipboard.writeText(opts.url);
    return "copied" as const;
  } catch {
    return "failed" as const;
  }
};
