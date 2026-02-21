import { Link } from "react-router-dom";
import { Star, MapPin, ShieldCheck, Clock, IndianRupee, Gift } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ItemListing } from "@/lib/mockData";

const categoryConfig = {
  rent: { label: "For Rent", variant: "default" as const, icon: Clock },
  sale: { label: "For Sale", variant: "secondary" as const, icon: IndianRupee },
  donate: { label: "Free", variant: "outline" as const, icon: Gift },
};

const ItemCard = ({ item }: { item: ItemListing }) => {
  const cat = categoryConfig[item.category];
  const CatIcon = cat.icon;

  return (
    <Link
      to={`/item/${item.id}`}
      className="group block rounded-xl border border-border bg-card overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={item.images[0]}
          alt={item.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute top-3 left-3">
          <Badge
            variant={cat.variant}
            className="gap-1 text-xs font-semibold shadow-sm"
          >
            <CatIcon className="h-3 w-3" />
            {cat.label}
          </Badge>
        </div>
        {item.provider.verified && (
          <div className="absolute top-3 right-3">
            <ShieldCheck className="h-5 w-5 text-primary drop-shadow" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-2">
        <h3 className="font-semibold text-card-foreground line-clamp-1 group-hover:text-primary transition-colors">
          {item.title}
        </h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          {item.location}
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="font-bold text-lg text-card-foreground">
            {item.category === "donate" ? (
              <span className="text-primary">Free</span>
            ) : (
              <>₹{item.price.toLocaleString()}{item.category === "rent" && <span className="text-xs font-normal text-muted-foreground">/day</span>}</>
            )}
          </span>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="h-3.5 w-3.5 fill-accent text-accent" />
            {item.rating} ({item.reviewCount})
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ItemCard;
