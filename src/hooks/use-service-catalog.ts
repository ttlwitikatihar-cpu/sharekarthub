import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { BriefcaseBusiness } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SERVICE_CATEGORIES, SERVICE_CATEGORY_ALIASES, getCustomServiceLabel, type ServiceCategory } from "@/lib/services";

export const useServiceCatalog = () => {
  const query = useQuery({
    queryKey: ["service-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase.from("service_catalog").select("slug,label,parent_slug").order("created_at");
      if (error) throw error;
      return data;
    },
    staleTime: 300_000,
  });
  return useMemo(() => {
    const categories: ServiceCategory[] = SERVICE_CATEGORIES.map(c => ({ ...c, services: [...c.services] }));
    for (const row of query.data ?? []) {
      if (!row.parent_slug && !categories.some(c => c.slug === row.slug)) {
        categories.push({ slug: row.slug, label: row.label, shortLabel: row.label, description: "Local service providers", icon: BriefcaseBusiness, tint: "bg-primary/10", iconTone: "text-primary", services: [] });
      }
    }
    for (const row of query.data ?? []) {
      const parent = categories.find(c => c.slug === row.parent_slug);
      if (parent && !parent.services.some(s => s.slug === row.slug)) parent.services.push({ slug: row.slug, label: row.label });
    }
    const normalize = (slug?: string | null) => SERVICE_CATEGORY_ALIASES[slug ?? ""] ?? slug;
    const getCategory = (slug?: string | null) => categories.find(c => c.slug === normalize(slug));
    const getParent = (slug?: string | null) => getCategory(slug) ?? categories.find(c => c.services.some(s => s.slug === normalize(slug)));
    const getLabel = (slug?: string | null) => categories.flatMap(c => c.services).find(s => s.slug === normalize(slug))?.label ?? getCustomServiceLabel(slug) ?? getCategory(slug)?.label ?? "Other services";
    const matches = (item: { listing_type?: string | null; service_category?: string | null; service_subcategory?: string | null }, slug: string) => {
      if (item.listing_type !== "service") return false;
      if (item.service_subcategory === slug) return true;
      const parent = getParent(slug);
      const option = parent?.services.find(s => s.slug === slug);
      if (option?.label === "Other" && item.service_category === parent?.slug && getCustomServiceLabel(item.service_subcategory)) return true;
      const category = getCategory(slug);
      return category ? item.service_category === category.slug || category.services.some(s => s.slug === item.service_subcategory) : item.service_category === slug;
    };
    return { categories, getCategory, getParent, getLabel, matches, isLoading: query.isLoading, error: query.error };
  }, [query.data, query.isLoading, query.error]);
};