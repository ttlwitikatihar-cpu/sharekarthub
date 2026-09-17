import { Clock, IndianRupee, Gift, Wrench, LayoutGrid } from "lucide-react";

export type CategorySlug = "sell" | "rent" | "donate" | "service";

export interface CategoryDef {
  slug: CategorySlug;
  label: string;
  short: string;
  tagline: string;
  icon: typeof Clock;
  /** token-based tint classes */
  tint: string;
  ring: string;
  /** matcher against a listing row */
  match: (item: any) => boolean;
}

export const CATEGORY_DEFS: CategoryDef[] = [
  {
    slug: "sell",
    label: "For Sale",
    short: "Buy",
    tagline: "Pre-loved gear at neighbour prices",
    icon: IndianRupee,
    tint: "bg-primary/10 text-primary",
    ring: "hover:ring-primary/40",
    match: (i) => i.category === "sell",
  },
  {
    slug: "rent",
    label: "For Rent",
    short: "Rent",
    tagline: "Borrow by the day, return when done",
    icon: Clock,
    tint: "bg-accent/15 text-accent",
    ring: "hover:ring-accent/40",
    match: (i) => i.category === "rent",
  },
  {
    slug: "donate",
    label: "Free / Donate",
    short: "Free",
    tagline: "Claim free items, earn donor points",
    icon: Gift,
    tint: "bg-primary/15 text-primary",
    ring: "hover:ring-primary/40",
    match: (i) => i.category === "donate",
  },
  {
    slug: "service",
    label: "Services",
    short: "Services",
    tagline: "Book trusted local experts for every job",
    icon: Wrench,
    tint: "bg-accent/15 text-accent",
    ring: "hover:ring-accent/40",
    match: (i) => i.listing_type === "service",
  },
];

export const ALL_CATEGORY = {
  slug: "all" as const,
  label: "All Items",
  short: "All",
  icon: LayoutGrid,
};

export const getCategory = (slug?: string) =>
  CATEGORY_DEFS.find((c) => c.slug === slug);
