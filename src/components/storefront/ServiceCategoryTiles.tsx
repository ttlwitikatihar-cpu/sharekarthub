import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { SERVICE_CATEGORIES } from "@/lib/services";
import { cn } from "@/lib/utils";

interface ServiceCategoryTilesProps {
  counts: Record<string, number>;
}

const ServiceCategoryTiles = ({ counts }: ServiceCategoryTilesProps) => (
  <section aria-labelledby="service-categories" className="container py-6">
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <div className="mb-1 flex items-center gap-2 text-primary">
          <Sparkles className="h-4 w-4" />
          <span className="text-xs font-bold uppercase tracking-[0.14em]">Local services</span>
        </div>
        <h2 id="service-categories" className="text-xl font-bold tracking-tight sm:text-2xl">Find help that fits your day</h2>
        <p className="text-sm text-muted-foreground">Book trusted local experts for the job, not a one-size-fits-all marketplace.</p>
      </div>
      <Link to="/c/service" className="hidden items-center gap-1 text-sm font-semibold text-primary sm:flex">
        See all <ArrowRight className="h-4 w-4" />
      </Link>
    </div>

    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {SERVICE_CATEGORIES.map((service, index) => {
        const Icon = service.icon;
        const count = counts[service.slug] ?? 0;
        return (
          <motion.div key={service.slug} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
            <Link
              to={`/c/service?service=${service.slug}`}
              className="group flex h-full min-h-[142px] flex-col justify-between rounded-xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", service.tint)}>
                  <Icon className={cn("h-5 w-5", service.iconTone)} />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
              <div className="mt-3">
                <p className="font-semibold leading-tight group-hover:text-primary">{service.label}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{service.description}</p>
                <p className="mt-2 text-[11px] font-medium text-muted-foreground">{count} {count === 1 ? "provider" : "providers"}</p>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  </section>
);

export default ServiceCategoryTiles;