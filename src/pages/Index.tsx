import { useState, useMemo, useEffect, useDeferredValue } from "react";
import { Search, MapPin, Navigation, Store, Gift, Clock, Sparkles, PackageSearch, ShoppingBag, Wrench, Plus, X } from "lucide-react";
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
import { useServiceCatalog } from "@/hooks/use-service-catalog";
import { useSearchInterests } from "@/hooks/use-search-interests";
import { interestScore } from "@/lib/search-interests";
import { cn } from "@/lib/utils";

const Index = () => {
  const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get("q") ?? "");
  const [location, setLocation] = useState("");
  const [shopSearch, setShopSearch] = useState("");
  const [mode, setMode] = useState<"product" | "service">("product");
  const [resultPage, setResultPage] = useState(1);
  const deferredSearch = useDeferredValue(search);
  const { history, clear } = useSearchInterests(search);
  const catalog = useServiceCatalog();
  const { position, loading: geoLoading, requestLocation } = useGeolocation(true);
  const { data: listings = [], isLoading, error } = useListings();
  const shopMap = useSellerMap();
  const distanceFor = (item: any) => position && item.latitude != null && item.longitude != null ? getDistance(position.latitude, position.longitude, item.latitude, item.longitude) : null;
  const searching = Boolean(search || location || shopSearch);
  useEffect(() => { setResultPage(1); }, [search, location, shopSearch, mode]);
  const visible = useMemo(() => listings.filter(i => mode === "service" ? i.listing_type === "service" : i.listing_type !== "service"), [listings, mode]);
  const sorted = useMemo(() => [...visible].sort((a, b) => {
    const unavailable = Number(a.status === "out_of_stock" || a.quantity <= 0) - Number(b.status === "out_of_stock" || b.quantity <= 0);
    if (unavailable) return unavailable;
    if (position) return (distanceFor(a) ?? 1e9) - (distanceFor(b) ?? 1e9);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  }), [visible, position]);
  const results = useMemo(() => sorted.filter(i => {
    const seller = shopMap.get(i.user_id);
    const text = `${i.title} ${i.description ?? ""} ${catalog.getLabel(i.service_subcategory)} ${seller?.shop_name ?? ""}`.toLowerCase();
    return (!deferredSearch || text.includes(deferredSearch.toLowerCase())) && (!location || i.location?.toLowerCase().includes(location.toLowerCase())) && (!shopSearch || `${seller?.shop_name ?? ""} ${seller?.full_name ?? ""}`.toLowerCase().includes(shopSearch.toLowerCase()));
  }), [sorted, deferredSearch, location, shopSearch, shopMap, catalog]);
  const counts = useMemo(() => Object.fromEntries(CATEGORY_DEFS.map(c => [c.slug, listings.filter(c.match).length])), [listings]);
  const serviceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of listings) if (item.listing_type === "service") {
      const parent = item.service_category || catalog.getParent(item.service_subcategory)?.slug;
      if (parent) counts[parent] = (counts[parent] ?? 0) + 1;
    }
    return counts;
  }, [listings, catalog]);
  const recommended = useMemo(() => sorted.map(item => ({ item, score: interestScore(`${item.title} ${item.description ?? ""} ${catalog.getLabel(item.service_category)} ${catalog.getLabel(item.service_subcategory)} ${shopMap.get(item.user_id)?.shop_name ?? ""}`, history) })).filter(x => x.score > 0).sort((a,b) => Number(a.item.status === "out_of_stock") - Number(b.item.status === "out_of_stock") || b.score - a.score).slice(0,8).map(x => x.item), [sorted, history, catalog, shopMap]);
  const products = useMemo(() => sorted.slice(0, 8), [sorted]);
  const free = useMemo(() => sorted.filter(i => i.category === "donate").slice(0,8), [sorted]);
  const rent = useMemo(() => sorted.filter(i => i.category === "rent").slice(0,8), [sorted]);

  return <div className="min-h-screen flex flex-col">
    <SEO title="ShareKart — Products & Services Near You" description="Find products to buy, rent or claim free, and browse local service providers on ShareKart." path="/" />
    <Navbar />
    <header className="border-b border-border bg-card">
      <div className="container pt-7 pb-0 space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div><p className="text-xs font-semibold text-primary mb-1">YOUR LOCAL MARKETPLACE</p><h1 className="text-3xl md:text-4xl font-bold">ShareKart</h1></div>
          <Button asChild variant="outline" className="shrink-0"><Link to="/list-item"><Plus className="h-4 w-4 mr-1" />List <span className="hidden sm:inline ml-1">an item</span></Link></Button>
        </div>
        <div className="grid gap-2 md:grid-cols-[1fr_170px_170px_40px]">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder={mode === "product" ? "Search products…" : "Search services…"} value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-background" aria-label="Search items" /></div>
          <div className="grid grid-cols-[1fr_1fr_40px] gap-2 md:contents">
            <div className="relative min-w-0"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Location" aria-label="Location" value={location} onChange={e => setLocation(e.target.value)} className="pl-9 bg-background" /></div>
            <div className="relative min-w-0"><Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Shop name" aria-label="Shop name" value={shopSearch} onChange={e => setShopSearch(e.target.value)} className="pl-9 bg-background" /></div>
            <Button variant="outline" size="icon" disabled={geoLoading} onClick={requestLocation} aria-label="Use my live location"><Navigation className="h-4 w-4" /></Button>
          </div>
        </div>
        <div role="tablist" aria-label="Marketplace departments" className="flex gap-2">
          <Button role="tab" aria-selected={mode === "product"} variant="ghost" onClick={() => setMode("product")} className={cn("rounded-none border-b-2 px-5 pb-4 h-12", mode === "product" ? "border-primary text-primary" : "border-transparent text-muted-foreground")}><ShoppingBag className="h-4 w-4 mr-2" />Products</Button>
          <Button role="tab" aria-selected={mode === "service"} variant="ghost" onClick={() => setMode("service")} className={cn("rounded-none border-b-2 px-5 pb-4 h-12", mode === "service" ? "border-primary text-primary" : "border-transparent text-muted-foreground")}><Wrench className="h-4 w-4 mr-2" />Services</Button>
        </div>
      </div>
    </header>
    <main className="flex-1 pb-8">
      {!searching && history.length > 0 && <section className="container pt-5 flex items-center gap-3"><div className="flex-1 min-w-0 flex items-center gap-2 overflow-x-auto"><Clock className="h-4 w-4 text-muted-foreground shrink-0" />{history.slice(0,5).map(h => <Button variant="outline" size="sm" key={h.term} className="shrink-0" onClick={() => setSearch(h.term)}>{h.term}</Button>)}</div><Button variant="ghost" size="icon" onClick={clear} aria-label="Clear search history and personalization" title="Clear search history"><X className="h-4 w-4" /></Button></section>}
      {isLoading ? <div className="container py-12 grid grid-cols-2 md:grid-cols-4 gap-4">{[1,2,3,4].map(n => <div key={n} className="h-64 bg-muted rounded-lg animate-pulse" />)}</div> : error ? <div className="container py-12 text-muted-foreground">Unable to load listings. Please refresh the page.</div> : searching ? <section className="container py-6">
        <div className="flex items-center gap-3 mb-5"><h2 className="text-xl font-bold">{results.length} {mode === "product" ? "products" : "services"} found</h2><Button variant="ghost" size="sm" onClick={() => { setSearch(""); setLocation(""); setShopSearch(""); }}>Clear search</Button></div>
        {!results.length ? <div className="text-center py-16 text-muted-foreground"><PackageSearch className="h-10 w-10 mx-auto mb-3" /><p>No matches. Try another search or department.</p></div> : <><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{results.slice(0,resultPage * 24).map(item => <ItemCard key={item.id} item={item} distanceKm={distanceFor(item)} />)}</div>{results.length > resultPage * 24 && <Button className="mt-6" variant="outline" onClick={() => setResultPage(p => p + 1)}>Show more</Button>}</>}
      </section> : <>
        {mode === "product" ? <CategoryTiles counts={counts} /> : <ServiceCategoryTiles counts={serviceCounts} />}
        {recommended.length > 0 && <ProductRail title="Picked for you" subtitle="Based on your recent searches" icon={<Sparkles className="h-5 w-5 text-accent" />} items={recommended} distanceFor={distanceFor} />}
        <ProductRail title={mode === "product" ? (position ? "Products near you" : "Latest products") : "Local service providers"} icon={mode === "product" ? <ShoppingBag className="h-5 w-5 text-primary" /> : <Wrench className="h-5 w-5 text-primary" />} items={products} viewAllHref={mode === "product" ? "/c/sell" : "/c/service"} distanceFor={distanceFor} />
        {mode === "product" && <><ProductRail title="Free to claim" icon={<Gift className="h-5 w-5 text-primary" />} items={free} viewAllHref="/c/donate" distanceFor={distanceFor} /><ProductRail title="Rent, don't buy" icon={<Clock className="h-5 w-5 text-accent" />} items={rent} viewAllHref="/c/rent" distanceFor={distanceFor} /></>}
        {!visible.length && <div className="container py-12 text-center text-muted-foreground">No {mode === "product" ? "products" : "services"} listed yet.</div>}
      </>}
    </main><Footer />
  </div>;
};
export default Index;
