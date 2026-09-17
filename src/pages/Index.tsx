import { useState, useMemo } from "react";
import { Search, MapPin, Navigation, Store, Gift, Clock, Sparkles, Star, ShieldCheck, ArrowRight, Flame, PackageSearch } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ItemCard from "@/components/ItemCard";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import CategoryTiles from "@/components/storefront/CategoryTiles";
import ServiceCategoryTiles from "@/components/storefront/ServiceCategoryTiles";
import ProductRail from "@/components/storefront/ProductRail";
import { useGeolocation, getDistance } from "@/hooks/use-geolocation";
import { useListings, useSellerMap } from "@/hooks/use-listings";
import { CATEGORY_DEFS } from "@/lib/categories";
import { SERVICE_CATEGORIES } from "@/lib/services";

const TRUST_POINTS = [
  { icon: ShieldCheck, label: "KYC-verified sellers" },
  { icon: Sparkles, label: "OTP-secured handovers" },
  { icon: Gift, label: "Donate & earn points" },
];

const Index = () => {
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [shopSearch, setShopSearch] = useState("");
  const { position, loading: geoLoading, requestLocation } = useGeolocation(true);

  const { data: listings = [], isLoading, error } = useListings();
  const shopMap = useSellerMap();

  const distanceFor = (item: any) =>
    position && item.latitude != null && item.longitude != null
      ? getDistance(position.latitude, position.longitude, item.latitude, item.longitude)
      : null;

  const searching = Boolean(search || location || shopSearch);

  const results = useMemo(() => {
    let items = [...listings];
    if (search) items = items.filter((i) => i.title.toLowerCase().includes(search.toLowerCase()));
    if (location) items = items.filter((i) => i.location?.toLowerCase().includes(location.toLowerCase()));
    if (shopSearch) {
      const q = shopSearch.toLowerCase();
      items = items.filter((i) => {
        const seller = shopMap.get(i.user_id);
        return seller?.shop_name?.toLowerCase().includes(q) || seller?.full_name?.toLowerCase().includes(q);
      });
    }
    return items;
  }, [listings, search, location, shopSearch, shopMap]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    CATEGORY_DEFS.forEach((cat) => {
      c[cat.slug] = listings.filter(cat.match).length;
    });
    return c;
  }, [listings]);

  const serviceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    SERVICE_CATEGORIES.forEach((service) => {
      counts[service.slug] = listings.filter((item) => item.listing_type === "service" && item.service_subcategory === service.slug).length;
    });
    return counts;
  }, [listings]);

  const inStock = useMemo(
    () => listings.filter((i) => i.status === "active" && (i as any).quantity > 0),
    [listings],
  );

  const nearby = useMemo(() => {
    if (!position) return [];
    return [...inStock]
      .filter((i) => i.latitude != null && i.longitude != null)
      .sort((a, b) => (distanceFor(a) ?? 1e9) - (distanceFor(b) ?? 1e9))
      .slice(0, 12);
  }, [inStock, position]);

  const freeItems = useMemo(() => inStock.filter((i) => i.category === "donate").slice(0, 12), [inStock]);
  const rentItems = useMemo(() => inStock.filter((i) => i.category === "rent").slice(0, 12), [inStock]);
  const serviceItems = useMemo(() => inStock.filter((i) => i.listing_type === "service").slice(0, 12), [inStock]);
  const trending = useMemo(
    () => [...inStock].sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0)).slice(0, 12),
    [inStock],
  );
  const fresh = useMemo(
    () =>
      [...inStock]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 12),
    [inStock],
  );

  const topShops = useMemo(() => {
    const byShop = new Map<string, { name: string; count: number; rating: number | null }>();
    inStock.forEach((i) => {
      const s = shopMap.get(i.user_id);
      if (!s?.shop_name) return;
      const prev = byShop.get(i.user_id);
      byShop.set(i.user_id, {
        name: s.shop_name,
        count: (prev?.count ?? 0) + 1,
        rating: s.rating != null ? Number(s.rating) : null,
      });
    });
    return [...byShop.values()].sort((a, b) => b.count - a.count).slice(0, 6);
  }, [inStock, shopMap]);

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="ShareKart — Rent, Buy, and Donate Locally"
        description="Browse items to rent, buy, or claim free from verified neighbours. Local marketplace with OTP-secured handovers."
        path="/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "ShareKart",
          url: "https://sharekarthub.lovable.app/",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://sharekarthub.lovable.app/?q={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        }}
      />
      <Navbar />

      {/* Hero + universal search */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/5 py-12 md:py-16">
        <div className="container space-y-6">
          <div className="text-center space-y-4">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-4xl md:text-6xl font-black tracking-tight"
            >
              Rent. Buy. <span className="text-gradient">Donate.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="text-lg text-muted-foreground max-w-xl mx-auto"
            >
              Everything your neighbourhood already owns — in one marketplace.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="max-w-3xl mx-auto flex flex-col sm:flex-row gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search items..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-card" aria-label="Search items" />
            </div>
            <div className="relative flex-1 sm:max-w-[170px]">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} className="pl-9 bg-card" aria-label="Location" />
            </div>
            <div className="relative flex-1 sm:max-w-[170px]">
              <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Shop name" value={shopSearch} onChange={(e) => setShopSearch(e.target.value)} className="pl-9 bg-card" aria-label="Shop name" />
            </div>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0 bg-card"
              onClick={() => requestLocation()}
              disabled={geoLoading}
              aria-label="Use my live location"
            >
              <Navigation className={`h-4 w-4 ${position ? "text-primary" : "text-muted-foreground"}`} />
            </Button>
          </motion.div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            {TRUST_POINTS.map((t) => (
              <span key={t.label} className="flex items-center gap-1.5">
                <t.icon className="h-3.5 w-3.5 text-primary" />
                {t.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <main className="flex-1">
        {isLoading ? (
          <div className="container py-20 text-center text-muted-foreground">Loading listings...</div>
        ) : error ? (
          <div className="container py-20 text-center text-muted-foreground">
            <p>Unable to load listings. Please refresh the page.</p>
          </div>
        ) : searching ? (
          <section className="container py-8">
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <h2 className="text-xl font-bold tracking-tight">
                {results.length} {results.length === 1 ? "result" : "results"}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setLocation(""); setShopSearch(""); }}>
                Clear search
              </Button>
            </div>
            {results.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <PackageSearch className="h-10 w-10 mx-auto mb-4 opacity-40" />
                <p>No matches. Try a different keyword, location, or shop.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {results.map((item, i) => (
                  <motion.div key={item.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: Math.min(i, 8) * 0.04 }}>
                    <ItemCard item={item} distanceKm={distanceFor(item)} />
                  </motion.div>
                ))}
              </div>
            )}
          </section>
        ) : (
          <>
            <CategoryTiles counts={counts} />

            <ServiceCategoryTiles counts={serviceCounts} />

            <ProductRail
              title="Services near you"
              subtitle="Local experts ready to help"
              icon={<Sparkles className="h-5 w-5 text-primary" />}
              items={serviceItems}
              viewAllHref="/c/service"
              distanceFor={distanceFor}
            />

            <ProductRail
              title="Near you"
              subtitle="Closest pickups first"
              icon={<Navigation className="h-5 w-5 text-primary" />}
              items={nearby}
              viewAllHref="/c/sell"
              distanceFor={distanceFor}
            />

            <ProductRail
              title="Free to claim"
              subtitle="Donated by your neighbours"
              icon={<Gift className="h-5 w-5 text-primary" />}
              items={freeItems}
              viewAllHref="/c/donate"
              distanceFor={distanceFor}
            />

            <ProductRail
              title="Rent by the day"
              subtitle="Use it, return it, pay less"
              icon={<Clock className="h-5 w-5 text-accent" />}
              items={rentItems}
              viewAllHref="/c/rent"
              distanceFor={distanceFor}
            />

            <ProductRail
              title="Trending now"
              subtitle="Most viewed this week"
              icon={<Flame className="h-5 w-5 text-accent" />}
              items={trending}
              distanceFor={distanceFor}
            />

            {topShops.length > 0 && (
              <section className="container py-6">
                <h2 className="text-xl font-bold tracking-tight mb-4 flex items-center gap-2">
                  <Store className="h-5 w-5 text-primary" /> Top shops
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {topShops.map((s) => (
                    <div key={s.name} className="rounded-xl border border-border bg-card p-4 text-center space-y-1 transition-all hover:-translate-y-1 hover:shadow-md">
                      <div className="mx-auto h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                      <p className="text-sm font-semibold truncate">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.count} items</p>
                      {s.rating ? (
                        <p className="text-xs flex items-center justify-center gap-0.5 text-accent font-medium">
                          <Star className="h-3 w-3 fill-accent" /> {s.rating.toFixed(1)}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            )}

            <ProductRail
              title="Fresh arrivals"
              subtitle="Just listed on ShareKart"
              icon={<Sparkles className="h-5 w-5 text-primary" />}
              items={fresh}
              distanceFor={distanceFor}
            />

            {/* Seller CTA */}
            <section className="container py-10">
              <div className="rounded-2xl border border-border bg-gradient-to-r from-primary/10 via-card to-accent/10 p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="flex-1 space-y-1">
                  <h2 className="text-xl font-bold tracking-tight">Have something sitting idle?</h2>
                  <p className="text-sm text-muted-foreground">
                    List it in under a minute — rent it out, sell it, or donate it and climb the donor leaderboard.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button asChild>
                    <Link to="/list-item">
                      List an item <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/leaderboard">Donor leaderboard</Link>
                  </Button>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Index;
