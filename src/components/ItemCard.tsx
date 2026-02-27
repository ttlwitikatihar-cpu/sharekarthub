import { Link } from "react-router-dom";
import { MapPin, Clock, IndianRupee, Gift, Wrench, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Database } from "@/integrations/supabase/types";

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

  return (
    <Link
      to={`/item/${item.id}`}
      className="group block rounded-xl border border-border bg-card overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {item.images && item.images[0] ? (
          <img src={item.images[0]} alt={item.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm">No image</div>
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
          {outOfStock && (
            <Badge variant="destructive" className="text-xs font-semibold shadow-sm">Out of Stock</Badge>
          )}
        </div>
      </div>

      <div className="p-4 space-y-2">
        <h3 className="font-semibold text-card-foreground line-clamp-1 group-hover:text-primary transition-colors">{item.title}</h3>
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
