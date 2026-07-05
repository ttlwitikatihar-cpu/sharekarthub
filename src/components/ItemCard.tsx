import { Link } from "react-router-dom";
import { MapPin, Clock, IndianRupee, Gift, Wrench, Star, Store, User, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useWishlist } from "@/lib/wishlist";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type Listing = Database["public"]["Tables"]["listings"]["Row"];

const categoryConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline"; icon: typeof Clock }> = {
  rent: { label: "For Rent", variant: "default", icon: Clock },
  sell: { label: "For Sale", variant: "secondary", icon: IndianRupee },
  donate: { label: "Free", variant: "outline", icon: Gift },
};

interface ItemCardProps {
  item: Listing;
  distanceKm?: number | null;
}

const ItemCard = ({ item, distanceKm }: ItemCardProps) => {
  const cat = categoryConfig[item.category] || categoryConfig.sell;
  const CatIcon = cat.icon;
  const outOfStock = item.status === "out_of_stock" || (item as any).quantity <= 0;
  const listingType = (item as any).listing_type as string | undefined;
  const isDonation = item.category === "donate";
  const { user } = useAuth();
  const { has: isWishlisted, toggle: toggleWishlist } = useWishlist();
  const isOwner = user?.id === item.user_id;
  const wished = isWishlisted(item.id);

  const stopAnd = (fn: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  };

  const { data: sellerProfile } = useQuery({
    queryKey: ["seller-profile", item.user_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, shop_name, rating, total_reviews")
        .eq("user_id", item.user_id)
        .single();
      return data;
    },
    staleTime: 60000,
  });

  return (
    <Link
      to={outOfStock ? "#" : `/item/${item.id}`}
      onClick={outOfStock ? (e: React.MouseEvent) => e.preventDefault() : undefined}
      className={`group block rounded-xl border border-border bg-card overflow-hidden transition-all ${outOfStock ? "opacity-60 cursor-not-allowed" : "hover:shadow-lg hover:-translate-y-1"}`}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {item.images && item.images[0] ? (
          <img src={item.images[0]} alt={item.title} className={`h-full w-full object-cover transition-transform duration-300 ${outOfStock ? "grayscale" : "group-hover:scale-105"}`} loading="lazy" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm">No image</div>
        )}
        {outOfStock && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
            <span className="bg-destructive text-destructive-foreground px-3 py-1.5 rounded-md text-sm font-bold">Out of Stock</span>
          </div>
        )}
        <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
          <Badge variant={cat.variant} className="gap-1 text-xs font-semibold shadow-sm">
            <CatIcon className="h-3 w-3" />
            {cat.label}
          </Badge>
          {listingType === "service" && (
            <Badge variant="secondary" className="gap-1 text-xs font-semibold shadow-sm">
              <Wrench className="h-3 w-3" /> Service
            </Badge>
          )}
        </div>
        {!isOwner && (
          <div className="absolute top-3 right-3 flex flex-col gap-1.5">
            <button
              onClick={stopAnd(() => toggleWishlist(item.id))}
              aria-label="Toggle wishlist"
              className="h-8 w-8 rounded-full bg-background/90 backdrop-blur flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
            >
              <Heart className={cn("h-4 w-4", wished ? "fill-primary text-primary" : "text-muted-foreground")} />
            </button>
          </div>
        )}
      </div>


      <div className="p-4 space-y-2">
        <h3 className="font-semibold text-card-foreground line-clamp-1 group-hover:text-primary transition-colors">{item.title}</h3>

        {/* Seller / Shop / Donor info */}
        {sellerProfile && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {isDonation ? (
              <>
                <Heart className="h-3 w-3 shrink-0 text-primary fill-primary" />
                <span className="truncate text-primary font-medium">
                  Donated by {sellerProfile.shop_name || sellerProfile.full_name || "Anonymous"}
                </span>
              </>
            ) : sellerProfile.shop_name ? (
              <>
                <Store className="h-3 w-3 shrink-0" />
                <span className="truncate">{sellerProfile.shop_name}</span>
              </>
            ) : (
              <>
                <User className="h-3 w-3 shrink-0" />
                <span className="truncate">{sellerProfile.full_name || "Seller"}</span>
              </>
            )}
            {sellerProfile.rating && Number(sellerProfile.rating) > 0 && (
              <span className="ml-auto flex items-center gap-0.5 text-accent font-medium">
                <Star className="h-3 w-3 fill-accent" />
                {Number(sellerProfile.rating).toFixed(1)}
              </span>
            )}
          </div>
        )}

        {(item.location || distanceKm != null) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {item.location}
            {distanceKm != null && (
              <span className="ml-auto font-medium text-primary">{distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm.toFixed(1)} km`}</span>
            )}
          </div>
        )}
        <div className="flex items-center justify-between pt-1">
          <span className="font-bold text-lg text-card-foreground">
            {item.category === "donate" ? (
              <span className="text-primary">Free</span>
            ) : (
              <>₹{(item.price ?? 0).toLocaleString()}{item.category === "rent" && <span className="text-xs font-normal text-muted-foreground">/day</span>}</>
            )}
          </span>
        </div>
      </div>
    </Link>
  );
};

export default ItemCard;
