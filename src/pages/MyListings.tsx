import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Edit, RefreshCw, Package, Eye, Search, X,
  TrendingUp, AlertTriangle, CheckCircle2, Plus, Minus, Save, Loader2,
  LayoutGrid, List as ListIcon, ArrowUpDown, PackageX, PackageCheck,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";

type Listing = any;
type Draft = { price?: number; quantity?: number };

const LOW_STOCK = 3;

const MyListings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "active" | "low" | "out">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("recent");
  const [view, setView] = useState<"list" | "grid">("list");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["my-listings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Keyboard: `/` focuses search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        (document.getElementById("inv-search") as HTMLInputElement)?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const stats = useMemo(() => {
    const total = listings.length;
    const active = listings.filter((l: Listing) => l.status === "active").length;
    const out = listings.filter((l: Listing) => l.status === "out_of_stock").length;
    const low = listings.filter((l: Listing) => l.status === "active" && l.quantity > 0 && l.quantity <= LOW_STOCK).length;
    const value = listings.reduce((s: number, l: Listing) => s + (Number(l.price) || 0) * (Number(l.quantity) || 0), 0);
    return { total, active, out, low, value };
  }, [listings]);

  const filtered = useMemo(() => {
    let items = [...listings];
    const q = search.trim().toLowerCase();
    if (q) items = items.filter((l: Listing) =>
      l.title?.toLowerCase().includes(q) ||
      l.description?.toLowerCase().includes(q) ||
      l.category?.toLowerCase().includes(q)
    );
    if (tab === "active") items = items.filter((l: Listing) => l.status === "active");
    else if (tab === "out") items = items.filter((l: Listing) => l.status === "out_of_stock");
    else if (tab === "low") items = items.filter((l: Listing) => l.status === "active" && l.quantity > 0 && l.quantity <= LOW_STOCK);
    if (categoryFilter !== "all") items = items.filter((l: Listing) => l.category === categoryFilter);

    switch (sortBy) {
      case "price-asc": items.sort((a, b) => (a.price || 0) - (b.price || 0)); break;
      case "price-desc": items.sort((a, b) => (b.price || 0) - (a.price || 0)); break;
      case "stock-asc": items.sort((a, b) => (a.quantity || 0) - (b.quantity || 0)); break;
      case "stock-desc": items.sort((a, b) => (b.quantity || 0) - (a.quantity || 0)); break;
      case "name": items.sort((a, b) => (a.title || "").localeCompare(b.title || "")); break;
      default: items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return items;
  }, [listings, search, tab, categoryFilter, sortBy]);

  const setDraft = (id: string, patch: Draft) => {
    setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));
  };

  const isDirty = (l: Listing) => {
    const d = drafts[l.id];
    if (!d) return false;
    return (d.price !== undefined && Number(d.price) !== Number(l.price)) ||
           (d.quantity !== undefined && Number(d.quantity) !== Number(l.quantity));
  };

  const saveDraft = async (l: Listing) => {
    const d = drafts[l.id];
    if (!d || !isDirty(l)) return;
    setSavingId(l.id);
    try {
      const updates: any = { updated_at: new Date().toISOString() };
      if (d.price !== undefined) updates.price = Number(d.price);
      if (d.quantity !== undefined) {
        const q = Math.max(0, Math.floor(Number(d.quantity)));
        updates.quantity = q;
        if (q === 0 && l.status === "active") updates.status = "out_of_stock";
        if (q > 0 && l.status === "out_of_stock") updates.status = "active";
      }
      const { error } = await supabase.from("listings").update(updates).eq("id", l.id);
      if (error) throw error;
      toast({ title: "Saved", description: `"${l.title}" updated.` });
      setDrafts((all) => { const { [l.id]: _, ...rest } = all; return rest; });
      qc.invalidateQueries({ queryKey: ["my-listings", user?.id] });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  const bumpStock = (l: Listing, delta: number) => {
    const current = drafts[l.id]?.quantity ?? l.quantity ?? 0;
    setDraft(l.id, { quantity: Math.max(0, current + delta) });
  };

  const quickRefill = async (l: Listing, amount: number) => {
    setSavingId(l.id);
    try {
      const newQty = (l.quantity || 0) + amount;
      const { error } = await supabase.from("listings")
        .update({ quantity: newQty, status: "active", updated_at: new Date().toISOString() })
        .eq("id", l.id);
      if (error) throw error;
      toast({ title: "Stock refilled", description: `+${amount} to "${l.title}"` });
      qc.invalidateQueries({ queryKey: ["my-listings", user?.id] });
    } catch (e: any) {
      toast({ title: "Refill failed", description: e.message, variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  const toggleStock = async (l: Listing) => {
    setSavingId(l.id);
    try {
      const newStatus = l.status === "out_of_stock" ? "active" : "out_of_stock";
      const updates: any = { status: newStatus, updated_at: new Date().toISOString() };
      if (newStatus === "active" && (l.quantity || 0) === 0) updates.quantity = 1;
      const { error } = await supabase.from("listings").update(updates).eq("id", l.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["my-listings", user?.id] });
    } catch (e: any) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">Sign in to view your listings.</p>
            <Link to="/auth"><Button>Sign In</Button></Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const InventoryRow = ({ l }: { l: Listing }) => {
    const draft = drafts[l.id] || {};
    const priceVal = draft.price ?? l.price;
    const qtyVal = draft.quantity ?? l.quantity;
    const dirty = isDirty(l);
    const isLow = l.status === "active" && l.quantity > 0 && l.quantity <= LOW_STOCK;
    const isOut = l.status === "out_of_stock" || l.quantity === 0;

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className={`group relative rounded-xl border bg-card transition-all hover:shadow-md ${
          dirty ? "border-primary ring-1 ring-primary/30" :
          isOut ? "border-destructive/30 bg-destructive/[0.02]" :
          isLow ? "border-amber-500/40" : "border-border"
        }`}
      >
        {/* status stripe */}
        <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${
          isOut ? "bg-destructive" : isLow ? "bg-amber-500" : "bg-primary"
        }`} />

        <div className="p-3 sm:p-4 pl-4 sm:pl-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          {/* Image + title */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="relative shrink-0">
              {l.images?.[0] ? (
                <img src={l.images[0]} alt={l.title} className={`h-14 w-14 sm:h-16 sm:w-16 rounded-lg object-cover ${isOut ? "opacity-60 grayscale" : ""}`} />
              ) : (
                <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-lg bg-muted flex items-center justify-center">
                  <Package className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              {isLow && !isOut && (
                <span className="absolute -top-1 -right-1 text-[9px] bg-amber-500 text-white font-bold px-1 rounded">LOW</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 flex-wrap">
                <Link to={`/item/${l.id}`} className="font-semibold text-sm sm:text-base leading-tight hover:text-primary line-clamp-1">
                  {l.title}
                </Link>
                {isOut && <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-[10px] h-5">OUT OF STOCK</Badge>}
              </div>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <Badge variant="secondary" className="text-[10px] capitalize h-4 px-1.5">{l.category}</Badge>
                <Badge variant="secondary" className="text-[10px] capitalize h-4 px-1.5">{l.listing_type}</Badge>
                <span className="text-[11px] text-muted-foreground">
                  {new Date(l.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </span>
              </div>
            </div>
          </div>

          {/* Inline editors: price + qty */}
          <div className="flex items-center gap-2 sm:gap-3">
            {l.category !== "donate" && (
              <div className="flex flex-col">
                <label className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">Price ₹</label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={priceVal ?? ""}
                  onChange={(e) => setDraft(l.id, { price: e.target.value === "" ? 0 : Number(e.target.value) })}
                  className={`h-9 w-20 sm:w-24 text-sm font-semibold ${draft.price !== undefined && Number(draft.price) !== Number(l.price) ? "border-primary" : ""}`}
                />
              </div>
            )}

            <div className="flex flex-col">
              <label className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">Stock</label>
              <div className="flex items-center rounded-md border border-input h-9 overflow-hidden">
                <button
                  type="button"
                  onClick={() => bumpStock(l, -1)}
                  className="h-full px-2 hover:bg-muted transition text-muted-foreground"
                  aria-label="Decrease stock"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <Input
                  type="number"
                  min={0}
                  value={qtyVal ?? 0}
                  onChange={(e) => setDraft(l.id, { quantity: e.target.value === "" ? 0 : Number(e.target.value) })}
                  className={`h-full w-11 sm:w-14 text-center border-0 rounded-none focus-visible:ring-0 px-0 text-sm font-semibold ${draft.quantity !== undefined && Number(draft.quantity) !== Number(l.quantity) ? "text-primary" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => bumpStock(l, 1)}
                  className="h-full px-2 hover:bg-muted transition text-muted-foreground"
                  aria-label="Increase stock"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 sm:justify-end flex-wrap sm:flex-nowrap">
            <AnimatePresence>
              {dirty && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                  <Button
                    size="sm"
                    onClick={() => saveDraft(l)}
                    disabled={savingId === l.id}
                    className="gap-1 h-8"
                  >
                    {savingId === l.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Save
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {isOut && !dirty && (
              <Button size="sm" onClick={() => quickRefill(l, 5)} className="gap-1 h-8 bg-primary" disabled={savingId === l.id}>
                <RefreshCw className="h-3.5 w-3.5" /> +5
              </Button>
            )}
            {isLow && !dirty && !isOut && (
              <Button size="sm" variant="outline" onClick={() => quickRefill(l, 5)} className="gap-1 h-8 border-amber-500/50 text-amber-700 hover:bg-amber-500/10" disabled={savingId === l.id}>
                <Plus className="h-3.5 w-3.5" /> Refill
              </Button>
            )}

            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              title={isOut ? "Mark active" : "Mark out of stock"}
              onClick={() => toggleStock(l)}
              disabled={savingId === l.id}
            >
              {isOut ? <PackageCheck className="h-4 w-4 text-primary" /> : <PackageX className="h-4 w-4 text-muted-foreground" />}
            </Button>

            <Link to={`/edit-listing/${l.id}`}>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Full edit">
                <Edit className="h-4 w-4" />
              </Button>
            </Link>
            <Link to={`/item/${l.id}`}>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="View">
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>
    );
  };

  const dirtyCount = Object.keys(drafts).filter((id) => {
    const l = listings.find((x: Listing) => x.id === id);
    return l && isDirty(l);
  }).length;

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <SEO title="Inventory — Manage Your Listings" description="Blinkit-style inventory manager: search, edit prices, update stock, and refill instantly." path="/my-listings" noindex />
      <Navbar />
      <main className="container flex-1 py-4 sm:py-6 max-w-6xl">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-3 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Inventory</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Find, price, and restock any item in seconds. Tap <kbd className="px-1 py-0.5 rounded border text-[10px]">/</kbd> to search.
            </p>
          </div>
          <Link to="/list-item">
            <Button size="sm" className="gap-1.5 shrink-0"><Plus className="h-4 w-4" />Add item</Button>
          </Link>
        </div>

        {/* Stat pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
          <StatPill icon={<Package className="h-4 w-4" />} label="Total" value={stats.total} tone="default" onClick={() => setTab("all")} active={tab === "all"} />
          <StatPill icon={<CheckCircle2 className="h-4 w-4" />} label="In stock" value={stats.active} tone="primary" onClick={() => setTab("active")} active={tab === "active"} />
          <StatPill icon={<AlertTriangle className="h-4 w-4" />} label="Low stock" value={stats.low} tone="amber" onClick={() => setTab("low")} active={tab === "low"} />
          <StatPill icon={<PackageX className="h-4 w-4" />} label="Out of stock" value={stats.out} tone="destructive" onClick={() => setTab("out")} active={tab === "out"} />
        </div>

        {/* Sticky toolbar */}
        <div className="sticky top-14 sm:top-16 z-20 -mx-4 px-4 sm:mx-0 sm:px-0 bg-muted/20 backdrop-blur pt-2 pb-3 border-b border-border mb-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                id="inv-search"
                placeholder="Search by name, category, description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-9 h-10 bg-background"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full hover:bg-muted flex items-center justify-center"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-10 w-[110px] bg-background text-sm"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="rent">Rent</SelectItem>
                  <SelectItem value="sell">Sell</SelectItem>
                  <SelectItem value="donate">Donate</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-10 w-[140px] bg-background text-sm gap-1">
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Most recent</SelectItem>
                  <SelectItem value="name">Name (A–Z)</SelectItem>
                  <SelectItem value="price-asc">Price: low to high</SelectItem>
                  <SelectItem value="price-desc">Price: high to low</SelectItem>
                  <SelectItem value="stock-asc">Stock: low to high</SelectItem>
                  <SelectItem value="stock-desc">Stock: high to low</SelectItem>
                </SelectContent>
              </Select>

              <Tabs value={view} onValueChange={(v) => setView(v as any)} className="hidden sm:block">
                <TabsList className="h-10">
                  <TabsTrigger value="list" className="px-2"><ListIcon className="h-4 w-4" /></TabsTrigger>
                  <TabsTrigger value="grid" className="px-2"><LayoutGrid className="h-4 w-4" /></TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {dirtyCount > 0 && (
            <div className="flex items-center gap-2 mt-2 text-xs text-primary">
              <TrendingUp className="h-3.5 w-3.5" />
              {dirtyCount} unsaved change{dirtyCount > 1 ? "s" : ""} — hit <strong>Save</strong> on each row to apply.
            </div>
          )}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-card border border-border animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-xl bg-card">
            <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground text-sm">
              {listings.length === 0 ? "You haven't listed anything yet." : "No items match your filters."}
            </p>
            {listings.length === 0 && (
              <Link to="/list-item" className="inline-block mt-3">
                <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" />List your first item</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className={view === "grid" ? "grid sm:grid-cols-2 gap-3" : "space-y-2.5"}>
            {filtered.map((l) => <InventoryRow key={l.id} l={l} />)}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

const StatPill = ({
  icon, label, value, tone, onClick, active,
}: {
  icon: React.ReactNode; label: string; value: number;
  tone: "default" | "primary" | "amber" | "destructive";
  onClick: () => void; active: boolean;
}) => {
  const toneClasses = {
    default: active ? "border-foreground bg-foreground/5" : "border-border hover:border-foreground/40",
    primary: active ? "border-primary bg-primary/10" : "border-border hover:border-primary/50",
    amber: active ? "border-amber-500 bg-amber-500/10" : "border-border hover:border-amber-500/50",
    destructive: active ? "border-destructive bg-destructive/10" : "border-border hover:border-destructive/50",
  }[tone];
  const iconTone = {
    default: "text-foreground",
    primary: "text-primary",
    amber: "text-amber-600",
    destructive: "text-destructive",
  }[tone];
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-xl border bg-card p-3 transition-all ${toneClasses}`}
    >
      <div className={`flex items-center gap-1.5 ${iconTone}`}>{icon}<span className="text-[11px] font-medium uppercase tracking-wide">{label}</span></div>
      <div className="text-xl sm:text-2xl font-bold mt-1">{value}</div>
    </button>
  );
};

export default MyListings;
