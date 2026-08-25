import { useMemo, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, MapPin, ArrowUpDown, Navigation, PackageSearch, Store, ChevronRight, LayoutGrid, Rows3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import ItemCard from "@/components/ItemCard";
import { CATEGORY_DEFS, getCategory } from "@/lib/categories";
import { useListings, useSellerMap } from "@/hooks/use-listings";
import { useGeolocation, getDistance } from "@/hooks/use-geolocation";
import { cn } from "@/lib/utils";

type Sort = "nearest" | "popular" | "price-asc" | "price-desc" | "newest";

const Category = () => {
  const { slug } = useParams<{ slug: string }>();
  const def = getCategory(slug);

  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [shopSearch, setShopSearch] = useState("");
  const [sortBy, setSortBy] = useState<Sort>("nearest");
  const [hideOutOfStock, setHideOutOfStock] = useState(false);
  const [dense, setDense] = useState(false);

  const { position, loading: geoLoading, requestLocation } = useGeolocation(true);
  const { data: listings = [], isLoading, error } = useListings();
  const shopMap = useSellerMap();

  const distanceFor = (item: any) =>
    position && item.latitude != null && item.longitude != null
      ? getDistance(position.latitude, position.longitude, item.latitude, item.longitude)
      : null;

  const items = useMemo(() => {
    if (!def) return [];
    let list = listings.filter(def.match);
    if (search) list = list.filter((i) => i.title.toLowerCase().includes(search.toLowerCase()));
    if (location) list = list.filter((i) => i.location?.toLowerCase().includes(location.toLowerCase()));
    if (shopSearch) {
      const q = shopSearch.toLowerCase();
      list = list.filter((i) => {
        const s = shopMap.get(i.user_id);
        return s?.shop_name?.toLowerCase().includes(q) || s?.full_name?.toLowerCase().includes(q);
      });
    }
    if (hideOutOfStock) list = list.filter((i) => i.status === "active" && (i as any).quantity > 0);

    const sorted = [...list];
    switch (sortBy) {
      case "popular":
        sorted.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
        break;
      case "price-asc":
        sorted.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
        break;
      case "price-desc":
        sorted.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
        break;
      case "newest":
        sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case "nearest":
        if (position) sorted.sort((a, b) => (distanceFor(a) ?? 1e9) - (distanceFor(b) ?? 1e9));
        break;
    }
    // keep out-of-stock visible but pushed to the end
    return sorted.sort((a, b) => Number(a.status === "out_of_stock") - Number(b.status === "out_of_stock"));
  }, [listings, def, search, location, shopSearch, hideOutOfStock, sortBy, position, shopMap]);

  if (!def) return <Navigate to="/" replace />;

  const Icon = def.icon;

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title={`${def.label} on ShareKart — Local Marketplace`}
        description={`${def.tagline}. Browse ${def.label.toLowerCase()} listings from verified neighbours near you on ShareKart.`}
        path={`/c/${def.slug}`}
      />
      <Navbar />

      {/* Category banner */}
      <section className="border-b border-border bg-gradient-to-r from-primary/10 via-background to-accent/5">
        <div className="container py-6 space-y-4">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-muted-foreground">
            <Link to="/" className="hover:text-primary">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">{def.label}</span>
          </nav>

          <div className="flex items-center gap-4">
            <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center shrink-0", def.tint)}>
              <Icon className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">{def.label}</h1>
              <p className="text-sm text-muted-foreground">{def.tagline}</p>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {CATEGORY_DEFS.map((c) => (
              <Button
                key={c.slug}
                asChild
                size="sm"
                variant={c.slug === def.slug ? "default" : "outline"}
                className="text-xs"
              >
                <Link to={`/c/${c.slug}`}>{c.short}</Link>
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Sticky filter toolbar */}
      <div className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="container py-3 flex flex-col lg:flex-row gap-2 lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={`Search ${def.label.toLowerCase()}...`} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" aria-label="Search in category" />
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1 lg:w-[150px]">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} className="pl-9" aria-label="Filter by location" />
            </div>
            <div className="relative flex-1 lg:w-[150px]">
              <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Shop" value={shopSearch} onChange={(e) => setShopSearch(e.target.value)} className="pl-9" aria-label="Filter by shop name" />
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as Sort)}>
              <SelectTrigger className="w-[160px] text-xs" aria-label="Sort listings">
                <ArrowUpDown className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nearest">Nearest Location</SelectItem>
                <SelectItem value="popular">Most Popular</SelectItem>
                <SelectItem value="price-asc">Price: Low → High</SelectItem>
                <SelectItem value="price-desc">Price: High → Low</SelectItem>
                <SelectItem value="newest">Newest First</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => requestLocation()} disabled={geoLoading} aria-label="Use my live location">
              <Navigation className={`h-4 w-4 ${position ? "text-primary" : "text-muted-foreground"}`} />
            </Button>
            <Button
              variant={hideOutOfStock ? "default" : "outline"}
              size="sm"
              className="text-xs whitespace-nowrap"
              onClick={() => setHideOutOfStock((v) => !v)}
            >
              In stock only
            </Button>
            <Button variant="outline" size="icon" onClick={() => setDense((v) => !v)} aria-label="Toggle grid density">
              {dense ? <LayoutGrid className="h-4 w-4" /> : <Rows3 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      <main className="container flex-1 py-6">
        {isLoading ? (
          <p className="py-20 text-center text-muted-foreground">Loading listings...</p>
        ) : error ? (
          <p className="py-20 text-center text-muted-foreground">Unable to load listings. Please refresh the page.</p>
        ) : items.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground space-y-4">
            <PackageSearch className="h-10 w-10 mx-auto opacity-40" />
            <p>Nothing here yet in {def.label}.</p>
            <Button asChild>
              <Link to="/list-item">Be the first to list</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-4">
              <p className="text-sm text-muted-foreground">{items.length} items found</p>
              <Badge variant="secondary" className="text-xs">{def.label}</Badge>
            </div>
            <div className={cn("grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3", dense ? "xl:grid-cols-5" : "xl:grid-cols-4")}>
              {items.map((item, i) => (
                <motion.div key={item.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: Math.min(i, 8) * 0.04 }}>
                  <ItemCard item={item} distanceKm={distanceFor(item)} />
                </motion.div>
              ))}
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Category;
