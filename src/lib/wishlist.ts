import { useEffect, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
  const { user } = useAuth();
  const qc = useQueryClient();
  const [localIds, setLocalIds] = useState<string[]>(() => read());

  useEffect(() => {
    const sync = () => setLocalIds(read());
    window.addEventListener("wishlist-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("wishlist-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const { data: dbIds = [] } = useQuery({
    queryKey: ["wishlist", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("wishlist_items").select("listing_id").eq("user_id", user.id);
      return (data ?? []).map((r) => r.listing_id);
    },
    enabled: !!user,
  });

  const ids = user ? dbIds : localIds;

  const toggle = useCallback(
    async (id: string) => {
      if (!user) {
        const current = read();
        const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
        write(next);
        return next.includes(id);
      }
      const exists = dbIds.includes(id);
      if (exists) {
        await supabase.from("wishlist_items").delete().eq("user_id", user.id).eq("listing_id", id);
      } else {
        await supabase.from("wishlist_items").insert({ user_id: user.id, listing_id: id });
      }
      qc.invalidateQueries({ queryKey: ["wishlist", user.id] });
      return !exists;
    },
    [user, dbIds, qc]
  );

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
    /* user cancelled */
  }
  try {
    await navigator.clipboard.writeText(opts.url);
    return "copied" as const;
  } catch {
    return "failed" as const;
  }
};
