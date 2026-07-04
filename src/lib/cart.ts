import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface CartItemRow {
  id: string;
  listing_id: string;
  quantity: number;
  listing: {
    id: string;
    title: string;
    price: number | null;
    category: string;
    images: string[] | null;
    user_id: string;
    quantity: number;
    status: string;
    security_deposit: number | null;
  } | null;
}

export const useCart = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["cart", user?.id],
    queryFn: async (): Promise<CartItemRow[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("cart_items")
        .select("id, listing_id, quantity, listing:listings(id,title,price,category,images,user_id,quantity,status,security_deposit)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any;
    },
    enabled: !!user,
  });

  const count = items.reduce((s, i) => s + i.quantity, 0);

  const add = useCallback(
    async (listingId: string, quantity = 1) => {
      if (!user) {
        toast({ title: "Sign in to use cart", variant: "destructive" });
        return false;
      }
      const existing = items.find((i) => i.listing_id === listingId);
      if (existing) {
        await supabase
          .from("cart_items")
          .update({ quantity: existing.quantity + quantity })
          .eq("id", existing.id);
      } else {
        const { error } = await supabase
          .from("cart_items")
          .insert({ user_id: user.id, listing_id: listingId, quantity });
        if (error) {
          toast({ title: "Could not add to cart", description: error.message, variant: "destructive" });
          return false;
        }
      }
      qc.invalidateQueries({ queryKey: ["cart", user.id] });
      toast({ title: "Added to cart" });
      return true;
    },
    [user, items, qc]
  );

  const updateQty = useCallback(
    async (id: string, quantity: number) => {
      if (quantity < 1) return;
      await supabase.from("cart_items").update({ quantity }).eq("id", id);
      qc.invalidateQueries({ queryKey: ["cart", user?.id] });
    },
    [qc, user?.id]
  );

  const remove = useCallback(
    async (id: string) => {
      await supabase.from("cart_items").delete().eq("id", id);
      qc.invalidateQueries({ queryKey: ["cart", user?.id] });
    },
    [qc, user?.id]
  );

  const clear = useCallback(async () => {
    if (!user) return;
    await supabase.from("cart_items").delete().eq("user_id", user.id);
    qc.invalidateQueries({ queryKey: ["cart", user.id] });
  }, [qc, user]);

  const has = useCallback((listingId: string) => items.some((i) => i.listing_id === listingId), [items]);

  return { items, count, isLoading, add, updateQty, remove, clear, has };
};
