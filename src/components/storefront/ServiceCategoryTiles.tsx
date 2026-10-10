import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { useServiceCatalog } from "@/hooks/use-service-catalog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ServiceCategoryTiles = ({ counts }: { counts: Record<string, number> }) => {
  const { categories } = useServiceCatalog();
  const [expanded, setExpanded] = useState(false);
  const ordered = [...categories].sort((a,b) => (counts[b.slug] ?? 0) - (counts[a.slug] ?? 0));
  return <section aria-labelledby="service-categories" className="container py-7">
    <div className="flex items-center justify-between gap-3 mb-4"><h2 id="service-categories" className="text-xl font-bold">Browse services</h2><Button asChild variant="ghost" size="sm" className="text-primary"><Link to="/c/service">See all <ArrowRight className="ml-1 h-4 w-4" /></Link></Button></div>
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {(expanded ? ordered : ordered.slice(0,6)).map(service => {
        const Icon = service.icon;
        return <Link key={service.slug} to={`/c/service?service=${service.slug}`} className="group flex flex-col items-start gap-3 rounded-lg border border-border bg-card p-4 hover:border-primary/40 transition-colors min-h-[130px]">
          <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center",service.tint)}><Icon className={cn("h-5 w-5",service.iconTone)} /></div>
          <div className="min-w-0"><h3 className="text-sm font-semibold break-words group-hover:text-primary">{service.label}</h3><p className="mt-1 text-xs text-muted-foreground">{counts[service.slug] ?? 0} providers</p></div>
        </Link>;
      })}
    </div>
    {ordered.length > 6 && <Button variant="ghost" size="sm" className="mt-3 text-primary" aria-expanded={expanded} onClick={() => setExpanded(e => !e)}>{expanded ? "Fewer categories" : `All ${ordered.length} categories`}{expanded ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}</Button>}
  </section>;
};
export default ServiceCategoryTiles;
