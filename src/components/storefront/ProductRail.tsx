import { useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import ItemCard from "@/components/ItemCard";

interface ProductRailProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  items: any[];
  viewAllHref?: string;
  distanceFor?: (item: any) => number | null;
}

/** Horizontally scrollable product rail with custom scroll controls. */
const ProductRail = ({ title, subtitle, icon, items, viewAllHref, distanceFor }: ProductRailProps) => {
  const scroller = useRef<HTMLDivElement>(null);

  if (!items.length) return null;

  const scrollBy = (dir: 1 | -1) => {
    scroller.current?.scrollBy({ left: dir * 340, behavior: "smooth" });
  };

  return (
    <section className="container py-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            {icon}
            {title}
          </h2>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="ml-auto flex items-center gap-1">
          {viewAllHref && (
            <Button asChild variant="ghost" size="sm" className="text-primary">
              <Link to={viewAllHref}>
                View all <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
          <Button variant="outline" size="icon" className="hidden sm:flex h-8 w-8" onClick={() => scrollBy(-1)} aria-label={`Scroll ${title} left`}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="hidden sm:flex h-8 w-8" onClick={() => scrollBy(1)} aria-label={`Scroll ${title} right`}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        ref={scroller}
        className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => (
          <div key={item.id} className="w-[240px] sm:w-[260px] shrink-0 snap-start">
            <ItemCard item={item} distanceKm={distanceFor?.(item) ?? null} />
          </div>
        ))}
      </div>
    </section>
  );
};

export default ProductRail;
