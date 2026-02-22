import { useState, useMemo } from "react";
import { Search, MapPin, SlidersHorizontal, ArrowUpDown } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ItemCard from "@/components/ItemCard";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";

type ListingCategory = "rent" | "sale" | "donate";

const CATEGORIES: { value: ListingCategory | "all"; label: string }[] = [
  { value: "all", label: "All Items" },
  { value: "rent", label: "For Rent" },
  { value: "sale", label: "For Sale" },
  { value: "donate", label: "Free / Donate" },
];

const Index = () => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<ListingCategory | "all">("all");
  const [location, setLocation] = useState("");
  const [sortBy, setSortBy] = useState<"popular" | "price-asc" | "price-desc" | "newest" | "nearest">("popular");

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["listings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("status", "active");
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    let items = [...listings];
    if (category !== "all") items = items.filter((i) => i.category === category);
    if (search) items = items.filter((i) => i.title.toLowerCase().includes(search.toLowerCase()));
    if (location) items = items.filter((i) => i.location?.toLowerCase().includes(location.toLowerCase()));

    switch (sortBy) {
      case "popular": items.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0)); break;
      case "price-asc": items.sort((a, b) => (a.price ?? 0) - (b.price ?? 0)); break;
      case "price-desc": items.sort((a, b) => (b.price ?? 0) - (a.price ?? 0)); break;
      case "newest": items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); break;
      case "nearest":
        if (location) {
          const loc = location.toLowerCase();
          items.sort((a, b) => {
            const aMatch = a.location?.toLowerCase().includes(loc) ? 0 : 1;
            const bMatch = b.location?.toLowerCase().includes(loc) ? 0 : 1;
            return aMatch - bMatch;
          });
        }
        break;
    }
    return items;
  }, [listings, category, search, location, sortBy]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/5 py-16 md:py-24">
        <div className="container text-center space-y-6">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl md:text-6xl font-black tracking-tight"
          >
            Rent. Sell. <span className="text-gradient">Donate.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="text-lg text-muted-foreground max-w-xl mx-auto"
          >
            A trusted marketplace connecting people. List anything — from electronics to furniture — with escrow protection and verified users.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search items..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="relative flex-1 sm:max-w-[200px]">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} className="pl-9" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container flex-1 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((cat) => (
              <Button key={cat.value} variant={category === cat.value ? "default" : "outline"} size="sm" onClick={() => setCategory(cat.value)} className="text-xs">
                {cat.label}
              </Button>
            ))}
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-[160px] text-xs">
              <ArrowUpDown className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="price-asc">Price: Low → High</SelectItem>
              <SelectItem value="price-desc">Price: High → Low</SelectItem>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="nearest">Nearest Location</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center py-20 text-muted-foreground">Loading listings...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <SlidersHorizontal className="h-10 w-10 mx-auto mb-4 opacity-40" />
            <p>No items yet. Be the first to list something!</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">{filtered.length} items found</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filtered.map((item, i) => (
                <motion.div key={item.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.05 }}>
                  <ItemCard item={item} />
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

export default Index;
