import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SellerInfo = { shop_name: string | null; full_name: string; rating: number | null };

/** All browsable listings (active + out of stock so they stay visible, greyed out). */
export const useListings = () =>
  useQuery({
    queryKey: ["listings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .in("status", ["active", "out_of_stock"]);
      if (error) throw error;
      return data;
    },
    retry: 2,
    staleTime: 30000,
  });

/** Seller/shop directory used for shop search + rails. */
export const useSellerMap = () => {
  const { data = [] } = useQuery({
    queryKey: ["seller-profiles-index"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, shop_name, full_name, rating");
      return data || [];
    },
    staleTime: 60000,
  });

  return useMemo(() => {
    const m = new Map<string, SellerInfo>();
    (data as any[]).forEach((p) =>
      m.set(p.user_id, { shop_name: p.shop_name, full_name: p.full_name, rating: p.rating }),
    );
    return m;
  }, [data]);
};
