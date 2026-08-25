import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CATEGORY_DEFS } from "@/lib/categories";
import { cn } from "@/lib/utils";

interface CategoryTilesProps {
  counts: Record<string, number>;
}

/** Blinkit-style category tile grid — dynamic live counts per category. */
const CategoryTiles = ({ counts }: CategoryTilesProps) => (
  <section aria-labelledby="shop-by-category" className="container py-8">
    <div className="flex items-end justify-between mb-4">
      <div>
        <h2 id="shop-by-category" className="text-xl font-bold tracking-tight">
          Shop by category
        </h2>
        <p className="text-sm text-muted-foreground">Rent it, buy it, or get it free — from people near you</p>
      </div>
    </div>

    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
      {CATEGORY_DEFS.map((cat, i) => (
        <motion.div
          key={cat.slug}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.06 }}
        >
          <Link
            to={`/c/${cat.slug}`}
            className={cn(
              "group relative flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-4 ring-2 ring-transparent transition-all hover:-translate-y-1 hover:shadow-lg",
              cat.ring,
            )}
          >
            <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", cat.tint)}>
              <cat.icon className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold leading-tight group-hover:text-primary transition-colors">{cat.label}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{cat.tagline}</p>
            </div>
            <span className="mt-auto text-xs font-medium text-muted-foreground">
              {counts[cat.slug] ?? 0} {counts[cat.slug] === 1 ? "item" : "items"}
            </span>
          </Link>
        </motion.div>
      ))}
    </div>
  </section>
);

export default CategoryTiles;
